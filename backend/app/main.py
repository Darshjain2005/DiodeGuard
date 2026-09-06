import sys, os, threading, time, json, platform, psutil
from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'graphsage')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'rules')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'isolation_forest')))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

app = Flask(__name__)
CORS(app)

orchestrator = None
orchestrator_error = None
replay_thread = None
replay_running = False

def get_orchestrator():
    global orchestrator, orchestrator_error
    if orchestrator is None and orchestrator_error is None:
        try:
            from orchestrator import DiodeGuardOrchestrator
            dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'combinenew.csv'))
            if not os.path.exists(dataset_path):
                dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'sample_traffic.csv'))
            orchestrator = DiodeGuardOrchestrator(dataset_path)
        except Exception as e:
            orchestrator_error = str(e)
            print(f"[!] Orchestrator failed to load: {e}")
    return orchestrator

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "alive"})

@app.route('/health', methods=['GET'])
def health_check():
    data = {}
    try:
        orch = get_orchestrator()
        if orch:
            data = orch.get_health_api()
        else:
            data = {"uptime": "N/A", "uptime_seconds": 0, "total_flows": 0, "total_alerts": 0,
                    "engines": {"Rule Engine": "OFFLINE", "Isolation Forest": "OFFLINE", "GraphSAGE": "OFFLINE"},
                    "throughput_fps": 0, "orchestrator_error": orchestrator_error}
    except Exception as e:
        data = {"uptime": "N/A", "uptime_seconds": 0, "total_flows": 0, "total_alerts": 0,
                "engines": {"Rule Engine": "ERROR", "Isolation Forest": "ERROR", "GraphSAGE": "ERROR"},
                "throughput_fps": 0, "error": str(e)}
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        data["cpu_percent"] = cpu
        data["memory_used_gb"] = round(mem.used / (1024**3), 1)
        data["memory_total_gb"] = round(mem.total / (1024**3), 1)
        data["memory_percent"] = mem.percent
    except:
        data["cpu_percent"] = 0
        data["memory_used_gb"] = 0
        data["memory_total_gb"] = 0
        data["memory_percent"] = 0
    data["hostname"] = platform.node()
    data["os"] = platform.system()
    data["python_version"] = platform.python_version()
    data["status"] = "online"
    data["service"] = "DiodeGuard ML Engine"
    return jsonify(data)

@app.route('/replay', methods=['POST'])
def start_replay():
    global replay_thread, replay_running
    if replay_running:
        return jsonify({"status": "already_running", "message": "Replay is already in progress"})
    count = request.json.get('count', 200) if request.json else 200
    delay = request.json.get('delay', 0.3) if request.json else 0.3
    def run_replay(count, delay):
        global replay_running
        replay_running = True
        try:
            from ingestion.flow_reader import FlowReader
            dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'combinenew.csv'))
            if not os.path.exists(dataset_path):
                dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'sample_traffic.csv'))
            reader = FlowReader(dataset_path)
            orch = get_orchestrator()
            processed = 0
            for flow in reader.stream_flows():
                if not replay_running: break
                orch.process_flow(flow)
                processed += 1
                if processed >= count: break
                time.sleep(delay)
            print(f"[*] Replay finished. Processed {processed} flows.")
        except Exception as e:
            print(f"[!] Replay error: {e}")
        finally:
            replay_running = False
    replay_thread = threading.Thread(target=run_replay, args=(count, delay), daemon=True)
    replay_thread.start()
    return jsonify({"status": "started", "message": f"Replaying {count} flows with {delay}s delay"})

@app.route('/replay/stop', methods=['POST'])
def stop_replay():
    global replay_running
    replay_running = False
    return jsonify({"status": "stopped"})

@app.route('/replay/status', methods=['GET'])
def replay_status():
    return jsonify({"running": replay_running})

@app.route('/metrics', methods=['GET'])
def get_metrics():
    try:
        orch = get_orchestrator()
        if not orch:
            return jsonify({"total_flows": 0, "total_alerts": 0, "threat_distribution": {},
                            "engines_active": 0, "rules_loaded": 0, "detection_rate": "0.0%",
                            "error": orchestrator_error})
        total = orch.stats["total_flows"]
        alerts = orch.stats["total_alerts"]
        rate = f"{(alerts / max(1, total)) * 100:.1f}%"
        return jsonify({"total_flows": total, "total_alerts": alerts,
                        "threat_distribution": orch.stats["threat_distribution"],
                        "engines_active": 3, "rules_loaded": len(orch.rule_engine.rules),
                        "detection_rate": rate})
    except Exception as e:
        return jsonify({"total_flows": 0, "total_alerts": 0, "threat_distribution": {},
                        "engines_active": 0, "rules_loaded": 0, "detection_rate": "0.0%",
                        "error": str(e)})

@app.route('/alerts', methods=['GET'])
def get_alerts():
    try:
        orch = get_orchestrator()
        if not orch:
            return jsonify([])
        severity = request.args.get('severity', 'ALL')
        category = request.args.get('category', 'ALL')
        return jsonify(orch.get_alerts_api(severity, category))
    except Exception as e:
        return jsonify([])

@app.route('/traffic', methods=['GET'])
def get_traffic():
    try:
        orch = get_orchestrator()
        if not orch:
            return jsonify({"total_flows": 0, "total_packets": 0, "total_bytes": 0,
                            "avg_bytes_per_flow": 0, "avg_packets_per_flow": 0,
                            "protocols": {}, "top_talkers": [], "top_ports": []})
        return jsonify(orch.get_traffic_api())
    except Exception as e:
        return jsonify({"total_flows": 0, "total_packets": 0, "total_bytes": 0,
                        "avg_bytes_per_flow": 0, "avg_packets_per_flow": 0,
                        "protocols": {}, "top_talkers": [], "top_ports": [], "error": str(e)})

@app.route('/models', methods=['GET'])
def get_models():
    try:
        orch = get_orchestrator()
        if not orch:
            return jsonify({"engines": {}, "total_flows": 0, "total_alerts": 0, "threat_distribution": {}})
        return jsonify(orch.get_models_api())
    except Exception as e:
        return jsonify({"engines": {}, "total_flows": 0, "total_alerts": 0,
                        "threat_distribution": {}, "error": str(e)})

if __name__ == '__main__':
    print("[*] Pre-loading detection engines...")
    get_orchestrator()
    print("[*] Starting DiodeGuard ML API on port 8000...")
    app.run(host='127.0.0.1', port=8000, debug=False, threaded=True)
