import os
path = r'd:\projects\DiodeGuard\DiodeGuard Blueprint.md'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

new_section = """
## 10. SYSTEM WALKTHROUGH & USAGE GUIDE

This section explains exactly how the system behaves when demonstrating the prototype to stakeholders or judges.

### Step 1: The Initial State (Idle)
When you first open the dashboard at `http://localhost:5173`, the system is in an idle, "listening" state. 
- The **Overview** page shows 0 flows and 0 alerts.
- The **System Health** page shows the ML Engine, Gateway, and React frontend are all `ONLINE`, but throughput is at `0.0 FPS`.
- This represents a monitoring enclave that is successfully connected to the data diode but waiting for traffic.

### Step 2: Triggering the Ingestion (Start Replay)
To simulate live traffic crossing the data diode, navigate to the **Live Detection** tab and click **Start Replay**.
**What happens under the hood:**
1. The React frontend sends a `POST /replay` request to the Python Flask API.
2. The Python backend spawns a background Daemon Thread.
3. The `FlowReader` begins reading `combinenew.csv` line-by-line, parsing network metadata into `FlowRecord` objects.
4. Each flow is sequentially pushed into the `DiodeGuardOrchestrator` for processing.

### Step 3: The Threat Detection Pipeline
As flows are processed (at roughly 1,500+ flows per second), they hit the 3-Engine ML Core simultaneously:
1. **Rule Engine:** Checks if the flow matches any hardcoded YAML thresholds (e.g., *Is this a port scan?*).
2. **Isolation Forest:** Checks if the flow's numerical vector is a statistical outlier compared to the benign baseline.
3. **GraphSAGE:** Attaches the flow to the temporal K-NN graph and checks if its structural connections resemble a botnet or C2 beacon.

*If an anomaly is detected:*
The orchestrator packages it into the Standardized Alert JSON Schema and POSTs it to the Node.js Gateway, which immediately broadcasts it to the frontend via Socket.IO.

### Step 4: Visualizing the Live Data
While the replay is running, every page on the dashboard comes alive with real data:
- **Live Detection:** Threat alerts slide into the table in real-time. You will see severity badges (CRITICAL, HIGH, MEDIUM) dynamically populating.
- **Overview:** The "Flows Analyzed" counter skyrockets. The Threat Distribution Area Chart begins graphing the exact types of attacks happening second-by-second. The Activity Stream at the bottom scrolls with text logs of the detections.
- **Traffic Analytics:** The Protocol Pie Chart shifts as TCP/UDP ratios change. The Top Talkers table populates with the specific IP addresses sending the most traffic and generating the most alerts.
- **Model Performance:** You can see exactly how many flows each ML model has processed, their detection rates, and their live inference latency (e.g., GraphSAGE running at ~3.5ms per flow).
- **Alerts Page:** SOC Analysts can now use the dropdowns to filter the historical alerts by Severity or Category, and click on individual rows to expand the forensic evidence.

### Step 5: Stopping the Replay
Clicking **Stop Replay** (or waiting for the batch to finish) halts the `FlowReader`. The system retains all calculated metrics and alert history for post-incident analysis, simulating the end of a traffic capture.

---
"""

text = text.replace('## 10. ARCHITECTURAL CONSTRAINTS COMPLIANCE', new_section + '\n## 11. ARCHITECTURAL CONSTRAINTS COMPLIANCE')
text = text.replace('## 11. TEAM CONTRIBUTION AREAS', '## 12. TEAM CONTRIBUTION AREAS')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
