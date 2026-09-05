import sys, os, threading, time, json, platform, psutil
from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'graphsage')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'rules')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'isolation_forest')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

app = Flask(__name__)
CORS(app)

orchestrator = None
replay_thread = None
replay_running = False

def get_orchestrator():
    global orchestrator
    if orchestrator is None:
        from orchestrator import DiodeGuardOrchestrator
        dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'combinenew.csv'))
        if not os.path.exists(dataset_path):
            dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'sample_traffic.csv'))
        orchestrator = DiodeGuardOrchestrator(dataset_path)
    return orchestrator

@app.route('/health', methods=['GET'])
def health_check():
    orch = get_orchestrator()
    data = orch.get_health_api()
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
    orch = get_orchestrator()
    total = orch.stats["total_flows"]
    alerts = orch.stats["total_alerts"]
    rate = f"{(alerts / max(1, total)) * 100:.1f}%"
    return jsonify({"total_flows": total, "total_alerts": alerts,
                    "threat_distribution": orch.stats["threat_distribution"],
                    "engines_active": 3, "rules_loaded": len(orch.rule_engine.rules),
                    "detection_rate": rate})

@app.route('/alerts', methods=['GET'])
def get_alerts():
    orch = get_orchestrator()
    severity = request.args.get('severity', 'ALL')
    category = request.args.get('category', 'ALL')
    return jsonify(orch.get_alerts_api(severity, category))

@app.route('/traffic', methods=['GET'])
def get_traffic():
    orch = get_orchestrator()
    return jsonify(orch.get_traffic_api())

@app.route('/models', methods=['GET'])
def get_models():
    orch = get_orchestrator()
    return jsonify(orch.get_models_api())

if __name__ == '__main__':
    print("[*] Pre-loading detection engines...")
    get_orchestrator()
    print("[*] Starting DiodeGuard ML API on port 8000...")
    app.run(host='127.0.0.1', port=8000, debug=False, threaded=True)
