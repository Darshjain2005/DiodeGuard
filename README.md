# DiodeGuard: Passive Threat Detection Pipeline

DiodeGuard is an AI/ML pipeline and visualization dashboard designed to detect, classify, and score cybersecurity threats in near real-time using **strictly passive, one-directional network flow data**. 

This prototype was built specifically for the SIH problem statement regarding critical-infrastructure monitoring enclaves that utilize data diodes (hardware that copies traffic in one direction only).

## Key Features
*   **Strictly Passive**: Ingests flow records incrementally (streaming). Never re-contacts the source, completely satisfying the read-only / no-return-path constraint.
*   **No Payload Decryption**: Analyzes traffic entirely through flow metadata (packet sizes, timing, inter-arrival sequences, and volume ratios) rather than deep packet inspection.
*   **Hybrid 3-Engine ML Pipeline**:
    *   **Rule Engine**: YAML-based heuristics targeting specific known threat behaviors (DDoS, Reconnaissance, Data Exfiltration).
    *   **Isolation Forest**: Unsupervised machine learning to detect statistical deviations from the benign baseline (Unknown Anomalies).
    *   **GraphSAGE (GNN)**: A Graph Neural Network that models traffic flows as a dynamic graph to detect structural anomalies.
*   **Real-time SOC Dashboard**: A React-based visualization interface showing live metrics, threat distribution, engine latencies, and an expandable alert feed.

---

## 🛠 Implementation & Developer Guide

### Prerequisites
*   **Node.js** (v18+ recommended)
*   **Python** (v3.8+ recommended)
*   **Git**

### 1. Python ML Backend Setup
The Python backend handles the ML Inference (GraphSAGE, Isolation Forest) and the Rule Engine.
```bash
cd backend
# Create a virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate  # On Windows
# Install dependencies
pip install Flask flask-cors pandas numpy scikit-learn torch requests psutil
```
*Note: If you have a `requirements.txt`, run `pip install -r requirements.txt` instead.*

### 2. Node.js WebSocket Gateway Setup
The Node.js server acts as a rapid middleman, catching alerts from Python and broadcasting them to the React frontend via Socket.IO.
```bash
cd node_backend
npm install
```

### 3. React Frontend Setup
The frontend is a Vite + React Single Page Application (SPA).
```bash
cd frontend
npm install
```

### 4. Running the Project
**Option A: One-Click Start (Windows)**
If you are on Windows, simply double-click the `run.bat` file in the root directory. This uses `concurrently` to launch all three servers simultaneously.

**Option B: Manual Start (Terminal)**
Open three separate terminals:
1.  **Terminal 1 (ML API)**: `cd backend` -> `python app\main.py` (Runs on port 8000)
2.  **Terminal 2 (Gateway)**: `cd node_backend` -> `node server.js` (Runs on port 5000)
3.  **Terminal 3 (Frontend)**: `cd frontend` -> `npm run dev` (Runs on port 5173)

### 5. Datasets
Due to file size limits, the large `combinenew.csv` dataset is ignored by Git. 
*   **Action Required**: Ensure you place your synthetic flow dataset (e.g., CIC-IDS2017) inside the `datasets/` folder and name it `combinenew.csv` so the Python orchestrator can find it during the replay simulation.

---

## Documentation
Please refer to `ARCHITECTURE.md` for a deep dive into the models used, feature engineering, and our training/validation approach.
