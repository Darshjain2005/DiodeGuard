import os
import re

path = r'd:\projects\DiodeGuard\backend\app\orchestrator.py'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Replace imports
imports_target = """import torch
import requests
import json
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'graphsage')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'rules')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'isolation_forest')))

from config import MODEL_SAVE_PATH as GRAPHSAGE_MODEL_PATH
from model import GraphSAGEDetector
from graph_construction import build_knn_graph"""

imports_replacement = """import requests
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
    HAS_TORCH = False"""

text = text.replace(imports_target, imports_replacement)

# 2. Patch load_engines
load_target = """        input_dim = len(self.feature_cols)
        self.gs_model = GraphSAGEDetector(in_channels=input_dim)
        if os.path.exists(GRAPHSAGE_MODEL_PATH):
            try: self.gs_model.load_state_dict(torch.load(GRAPHSAGE_MODEL_PATH, map_location=torch.device('cpu')))
            except: pass
            self.gs_model.eval()
            print("    - GraphSAGE Loaded successfully")"""

load_replacement = """        input_dim = len(self.feature_cols)
        if HAS_TORCH:
            self.gs_model = GraphSAGEDetector(in_channels=input_dim)
            if os.path.exists(GRAPHSAGE_MODEL_PATH):
                try: self.gs_model.load_state_dict(torch.load(GRAPHSAGE_MODEL_PATH, map_location=torch.device('cpu')))
                except: pass
                self.gs_model.eval()
                print("    - GraphSAGE Loaded successfully")
        else:
            print("    - GraphSAGE Disabled (No PyTorch)")"""
text = text.replace(load_target, load_replacement)

# 3. Patch process_flow (GraphSAGE inference)
process_target = """        # 3. GraphSAGE
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
            alerts.append({"engine": "GraphSAGE", "threat_class": "STRUCTURAL_ANOMALY", "severity": "CRITICAL", "confidence": conf, "evidence": "Anomalous graph structure in traffic", "category": "Anomaly"})"""

process_replacement = """        # 3. GraphSAGE
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
            self.engine_stats["GraphSAGE"]["calls"] += 1"""
text = text.replace(process_target, process_replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("orchestrator.py patched successfully")
