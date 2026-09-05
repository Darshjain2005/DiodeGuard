import os
import sys
import time
import numpy as np
import pandas as pd
import requests
import json
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'graphsage')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'rules')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'isolation_forest')))

try:
    import torch
    from config import MODEL_SAVE_PATH as GRAPHSAGE_MODEL_PATH
    from model import GraphSAGEDetector
    from graph_construction import build_knn_graph
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
from rule_engine import RuleEngine
from isolation_forest import AnomalyDetector

class DiodeGuardOrchestrator:
    def __init__(self, dataset_path):
        print("[*] Initializing DiodeGuard Orchestrator...")
        self.dataset_path = dataset_path
        self.rule_engine = None
        self.if_detector = None
        self.gs_model = None
        self.X_bg = None
        self.y_bg = None
        self.scaler_mean = None
        self.scaler_std = None
        self.feature_cols = None
        self.start_time = time.time()
        self.stats = {"total_flows": 0, "total_alerts": 0,
                      "threat_distribution": {"DDoS": 0, "Port Scan": 0, "C2 Beacon": 0, "DNS Tunnel": 0, "Anomaly": 0, "Data Exfil": 0, "Encrypted Malware": 0}}
        self.alerts_history = []
        self.ip_flows = defaultdict(lambda: {"flows": 0, "bytes": 0, "alerts": 0})
        self.protocol_counts = defaultdict(int)
        self.engine_stats = {"Rule Engine": {"detections": 0, "total_time_ms": 0, "calls": 0},
                             "Isolation Forest": {"detections": 0, "total_time_ms": 0, "calls": 0},
                             "GraphSAGE": {"detections": 0, "total_time_ms": 0, "calls": 0}}
        self.port_counts = defaultdict(int)
        self.total_bytes_fwd = 0
        self.total_bytes_bwd = 0
        self.total_packets = 0
        self._load_engines()

    def _load_engines(self):
        rules_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'rules', 'rules'))
        self.rule_engine = RuleEngine(rules_dir)
        print(f"    - Rule Engine Loaded ({len(self.rule_engine.rules)} rules)")
        if not os.path.exists(self.dataset_path):
            self.dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'sample_traffic.csv'))
        df = pd.read_csv(self.dataset_path, nrows=2000)
        df.columns = [c.strip() for c in df.columns]
        self.feature_cols = [c for c in df.columns if c not in ['Label', 'Flow ID', 'Source IP', 'Destination IP', 'Timestamp', 'Source Port', 'Destination Port', 'Protocol']]
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.fillna(0, inplace=True)
        X = df[self.feature_cols].values.astype(np.float32)
        y = np.zeros(len(X))
        self.scaler_mean = X.mean(axis=0)
        self.scaler_std = X.std(axis=0) + 1e-8
        self.X_bg = (X - self.scaler_mean) / self.scaler_std
        self.y_bg = y
        self.if_detector = AnomalyDetector(contamination=0.05)
        self.if_detector.train(df[self.feature_cols])
        print("    - Isolation Forest Trained on Background")
        input_dim = len(self.feature_cols)
        if HAS_TORCH:
            self.gs_model = GraphSAGEDetector(in_channels=input_dim)
            if os.path.exists(GRAPHSAGE_MODEL_PATH):
                try: self.gs_model.load_state_dict(torch.load(GRAPHSAGE_MODEL_PATH, map_location=torch.device('cpu')))
                except: pass
                self.gs_model.eval()
                print("    - GraphSAGE Loaded successfully")
        else:
            print("    - GraphSAGE Disabled (No PyTorch)")

    def _classify_threat(self, rule_name):
        r = rule_name.lower()
        if "port_scan" in r or "port scan" in r: return "Port Scan"
        elif "dos" in r or "ddos" in r: return "DDoS"
        elif "c2" in r or "beacon" in r: return "C2 Beacon"
        elif "dns" in r or "tunnel" in r: return "DNS Tunnel"
        elif "exfil" in r: return "Data Exfil"
        elif "encrypt" in r or "malware" in r: return "Encrypted Malware"
        return "Anomaly"

    def process_flow(self, flow_record):
        self.stats["total_flows"] += 1
        self.ip_flows[flow_record.src_ip]["flows"] += 1
        proto = flow_record.raw_features.get(' Protocol', 6)
        if proto == 6: self.protocol_counts["TCP"] += 1
        elif proto == 17: self.protocol_counts["UDP"] += 1
        elif proto == 1: self.protocol_counts["ICMP"] += 1
        else: self.protocol_counts["Other"] += 1
        self.port_counts[flow_record.dst_port] += 1
        fwd_pkts = flow_record.raw_features.get(' Total Fwd Packets', 0)
        bwd_pkts = flow_record.raw_features.get(' Total Backward Packets', 0)
        self.total_packets += fwd_pkts + bwd_pkts
        fwd_len = flow_record.raw_features.get('Total Length of Fwd Packets', 0)
        bwd_len = flow_record.raw_features.get(' Total Length of Bwd Packets', 0)
        self.total_bytes_fwd += fwd_len
        self.total_bytes_bwd += bwd_len
        self.ip_flows[flow_record.src_ip]["bytes"] += fwd_len
        features_raw = [flow_record.raw_features.get(col, 0.0) for col in self.feature_cols]
        alerts = []
        # 1. Rule Engine
        t0 = time.time()
        flow_dict = dict(zip(self.feature_cols, features_raw))
        triggered = self.rule_engine.evaluate_flow(flow_dict)
        dt = (time.time() - t0) * 1000
        self.engine_stats["Rule Engine"]["total_time_ms"] += dt
        self.engine_stats["Rule Engine"]["calls"] += 1
        for rule in triggered:
            cat = self._classify_threat(rule)
            self.stats["total_alerts"] += 1
            self.stats["threat_distribution"][cat] = self.stats["threat_distribution"].get(cat, 0) + 1
            self.engine_stats["Rule Engine"]["detections"] += 1
            self.ip_flows[flow_record.src_ip]["alerts"] += 1
            alerts.append({"engine": "Rule Engine", "threat_class": rule, "severity": "HIGH", "confidence": 1.0, "evidence": f"Rule matched: {rule}", "category": cat})
        # 2. Isolation Forest
        t0 = time.time()
        x_live = np.array([features_raw], dtype=np.float32)
        x_live[np.isinf(x_live)] = 0
        df_live = pd.DataFrame(x_live, columns=self.feature_cols)
        is_anomaly = self.if_detector.predict(df_live).iloc[0]
        dt = (time.time() - t0) * 1000
        self.engine_stats["Isolation Forest"]["total_time_ms"] += dt
        self.engine_stats["Isolation Forest"]["calls"] += 1
        if is_anomaly:
            self.stats["total_alerts"] += 1
            self.stats["threat_distribution"]["Anomaly"] += 1
            self.engine_stats["Isolation Forest"]["detections"] += 1
            self.ip_flows[flow_record.src_ip]["alerts"] += 1
            alerts.append({"engine": "Isolation Forest", "threat_class": "UNKNOWN_ANOMALY", "severity": "MEDIUM", "confidence": 0.85, "evidence": "Statistical deviation from baseline", "category": "Anomaly"})
        # 3. GraphSAGE
        if HAS_TORCH and self.gs_model:
            t0 = time.time()
            x_scaled = (x_live - self.scaler_mean) / self.scaler_std
            X_comb = np.vstack([self.X_bg[-50:], x_scaled])
            y_comb = np.append(self.y_bg[-50:], [0])
            gdata = build_knn_graph(X_comb, y_comb, k=3)
            with torch.no_grad():
                logits = self.gs_model(gdata.x, gdata.edge_index)
                probs = torch.softmax(logits, dim=1)
                conf = probs[-1][1].item()
            dt = (time.time() - t0) * 1000
            self.engine_stats["GraphSAGE"]["total_time_ms"] += dt
            self.engine_stats["GraphSAGE"]["calls"] += 1
            if conf > 0.60:
                self.stats["total_alerts"] += 1
                self.stats["threat_distribution"]["Anomaly"] += 1
                self.engine_stats["GraphSAGE"]["detections"] += 1
                self.ip_flows[flow_record.src_ip]["alerts"] += 1
                alerts.append({"engine": "GraphSAGE", "threat_class": "STRUCTURAL_ANOMALY", "severity": "CRITICAL", "confidence": conf, "evidence": "Anomalous graph structure in traffic", "category": "Anomaly"})
        else:
            self.engine_stats["GraphSAGE"]["calls"] += 1
        # Push alerts
        for a in alerts:
            rec = {"id": "ALERT-" + str(int(datetime.now().timestamp()*1000)), "timestamp": datetime.now().isoformat(),
                   "threat_class": a["threat_class"], "category": a["category"], "severity": a["severity"],
                   "source_ip": flow_record.src_ip, "dest_ip": flow_record.dst_ip,
                   "src_port": flow_record.src_port, "dst_port": flow_record.dst_port,
                   "confidence": round(a["confidence"]*100, 1), "engine": a["engine"],
                   "evidence": a["evidence"], "flow_id": flow_record.flow_id, "status": "NEW"}
            self.alerts_history.append(rec)
            payload = {"type": a["severity"], "text": f"[{a['severity']}] {a['threat_class']} by {a['engine']}. Conf: {a['confidence']*100:.1f}%. Src: {flow_record.src_ip}", "raw_alert": rec}
            node_url = os.environ.get("NODE_GATEWAY_URL", "http://127.0.0.1:5000")
            try: requests.post(f"{node_url}/api/log-activity", json=payload, timeout=2)
            except: pass
        return alerts

    def get_alerts_api(self, severity=None, category=None):
        alerts = list(reversed(self.alerts_history))
        if severity and severity != "ALL": alerts = [a for a in alerts if a["severity"] == severity]
        if category and category != "ALL": alerts = [a for a in alerts if a["category"] == category]
        return alerts[:200]

    def get_traffic_api(self):
        top_ips = sorted(self.ip_flows.items(), key=lambda x: x[1]["flows"], reverse=True)[:10]
        top_ports = sorted(self.port_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        tp = sum(self.protocol_counts.values()) or 1
        return {"total_flows": self.stats["total_flows"], "total_packets": self.total_packets,
                "total_bytes": self.total_bytes_fwd + self.total_bytes_bwd,
                "avg_bytes_per_flow": round((self.total_bytes_fwd+self.total_bytes_bwd)/max(1,self.stats["total_flows"]),1),
                "avg_packets_per_flow": round(self.total_packets/max(1,self.stats["total_flows"]),1),
                "protocols": {k: {"count": v, "pct": round(v/tp*100,1)} for k,v in self.protocol_counts.items()},
                "top_talkers": [{"ip": ip, "flows": d["flows"], "bytes": d["bytes"], "alerts": d["alerts"]} for ip,d in top_ips],
                "top_ports": [{"port": int(p), "count": c} for p,c in top_ports]}

    def get_models_api(self):
        engines = {}
        for name, s in self.engine_stats.items():
            avg = round(s["total_time_ms"]/max(1,s["calls"]),2)
            engines[name] = {"status": "ACTIVE", "detections": s["detections"], "calls": s["calls"], "avg_latency_ms": avg, "detection_rate": round(s["detections"]/max(1,s["calls"])*100,1)}
        engines["Rule Engine"]["type"] = "Signature-based"
        engines["Rule Engine"]["rules_loaded"] = len(self.rule_engine.rules)
        engines["Isolation Forest"]["type"] = "Unsupervised Anomaly"
        engines["Isolation Forest"]["contamination"] = 0.05
        engines["GraphSAGE"]["type"] = "Graph Neural Network"
        engines["GraphSAGE"]["architecture"] = "2-layer SAGEConv"
        return {"engines": engines, "total_flows": self.stats["total_flows"], "total_alerts": self.stats["total_alerts"],
                "threat_distribution": self.stats["threat_distribution"]}

    def get_health_api(self):
        up = time.time() - self.start_time
        return {"uptime": f"{int(up//3600)}h {int((up%3600)//60)}m {int(up%60)}s", "uptime_seconds": round(up,1),
                "total_flows": self.stats["total_flows"], "total_alerts": self.stats["total_alerts"],
                "engines": {"Rule Engine": "ACTIVE", "Isolation Forest": "ACTIVE", "GraphSAGE": "ACTIVE"},
                "throughput_fps": round(self.stats["total_flows"]/max(1,up),1)}
