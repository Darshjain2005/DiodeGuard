# DiodeGuard: Smart India Hackathon (SIH) Presentation Content Guide

This document contains highly detailed, technical content structured specifically for your SIH PowerPoint presentation slides. It includes specific angles tailored to impress hackathon judges regarding national impact and innovation.

---

## Slide 1: Problem Statement & Detailed Explanation of the System

**Title:** DiodeGuard: AI-Driven Passive Threat Detection Pipeline
**SIH Context:** Securing Critical National Infrastructure (CNI) via Hardware Data Diodes

**Core Objective:** To detect, classify, and score cyber-threats in a strictly one-directional monitoring enclave without relying on payload decryption or network return paths, ensuring attackers cannot pivot into the production network.

**Technical Architecture & Components:**
*   **Passive Ingress Layer:** The system ingests flow-level metadata (such as NetFlow/IPFIX) continuously. It operates strictly as a read-only listener, guaranteeing the air-gapped security integrity required by critical infrastructure (e.g., Power Grids, Telecom).
*   **Tri-Engine ML Inference Core:** To maximize detection rates while minimizing false positives, DiodeGuard utilizes a fused hybrid pipeline:
    1.  **Heuristic Rule Engine (O(1) complexity):** Rapid, deterministic matching for known volumetric threat vectors (e.g., DDoS thresholds, fan-out Reconnaissance, asymmetric Data Exfiltration).
    2.  **Isolation Forest (Unsupervised ML):** Trained dynamically on benign background baselines. It flags traffic flows that exhibit high statistical deviation in multi-dimensional space, effectively catching novel volumetric anomalies.
    3.  **GraphSAGE (Graph Neural Network):** Embeds network flows into a temporal K-Nearest Neighbors (K-NN) graph using PyTorch. It models traffic topographies to identify structural anomalies that statistical models miss (e.g., Botnet C2 beaconing fan-in/fan-out patterns).
*   **Real-Time Output Layer:** A Flask Python backend structures inferences into a standardized JSON schema and streams them to a Node.js Gateway. The Gateway broadcasts via WebSockets to a React-based SOC dashboard, rendering live metrics and confidence scores.

---

## Slide 2: Process of Implementation (Detailed Flow Process)

**Title:** End-to-End Implementation Flow
**Subtitle:** From Packet Ingestion to SOC Visualization

1.  **Step 1: Streaming Ingestion & Feature Engineering**
    *   Flow metadata is parsed incrementally from the ingress buffer. 
    *   High-fidelity numeric features (e.g., `Total Fwd Packets`, `Flow IAT Mean`, `Down/Up Ratio`) are extracted without touching the payload.
    *   Features are standardized dynamically using Z-score scaling (`StandardScaler`) calculated against a pre-computed benign baseline to prevent unbounded numerical explosions during neural network inference.
2.  **Step 2: Concurrent Inference Phase**
    *   *Engine A (Heuristics):* The flow dictionary is evaluated against compiled YAML signatures.
    *   *Engine B (Isolation Forest):* The standardized flow vector is mapped into the decision-tree space; if it crosses the 5% contamination boundary, it is flagged.
    *   *Engine C (GraphSAGE):* The new flow node is dynamically attached to a rolling-window background traffic graph using `PyTorch Geometric`. Messages are passed via 2-layer `SAGEConv` to calculate a local subgraph anomaly probability.
3.  **Step 3: Alert Aggregation & Contextualization**
    *   Triggered alarms from all three engines are unified. 
    *   Threat behaviors are algorithmically classified into the 6 specific SIH categories (Volumetric DDoS, Botnet C2, DGA/DNS Tunnels, Encrypted Malware, Reconnaissance, Data Exfiltration).
4.  **Step 4: Dispatch & Live Visualization**
    *   The Python Orchestrator POSTs the structured alert (Timestamp, Flow ID, Threat Class, Severity, Confidence Score) to the API Gateway.
    *   Broadcasts over `Socket.IO` to the React SOC Dashboard with bounded sub-50ms latency.

---

## Slide 3: Feasibility, Potential Challenges, and Risks (with Strategies)

**Title:** Feasibility, Risk Mitigation & Technical Challenges

*   **Challenge 1: Zero Payload Visibility (TLS/QUIC Encryption)**
    *   *Risk:* Complete inability to parse malicious payloads directly due to end-to-end encryption.
    *   *Strategy (Implemented):* DiodeGuard relies exclusively on behavioral metadata footprints. It detects encryption-wrapped malware through packet-size sequences, `Down/Up Ratio` asymmetries, and `Flow IAT (Inter-Arrival Time)` periodicity, entirely bypassing the need for DPI (Deep Packet Inspection).
*   **Challenge 4: Strictly Passive Read-Only Constraints**
    *   *Risk:* Utilizing data diodes means the system possesses absolutely no capability for active probing, challenge/response, or TCP teardowns.
    *   *Strategy (Implemented):* The architecture guarantees stateless, incremental stream-processing. Threat confidences are calculated solely on observed inbound metadata distributions. The system assumes a permanent "fire-and-forget" network state.
*   **Challenge 3: High-Throughput Inference Latency**
    *   *Risk:* Complex AI models (specifically Graph Neural Networks) can create severe processing bottlenecks on Gigabit backbone links.
    *   *Strategy (Implemented):* Configured the GraphSAGE model to only evaluate a rolling sub-graph window of recent nodes (K=3) rather than computing the global network state. This yields a highly optimized inference latency of `<5ms` per flow on standard CPU hardware.

---

## Slide 4: Benefits of the Solution & National Impact

**Title:** Innovation, Core Benefits & Future Scope

*   **Air-Gapped Forensic Integrity (National Security Impact):** 
    *   By strictly adhering to the one-directional data diode constraint, DiodeGuard preserves a mathematically clean chain of custody. Nation-state attackers absolutely cannot pivot from a compromised monitoring enclave back into the production ICS/SCADA environment.
*   **Zero-Day Threat Resiliency (The Innovation):** 
    *   By fusing traditional signature-based rules (for high-speed accuracy on known threats) with Unsupervised learning (Isolation Forest) and Structural learning (GraphSAGE), the pipeline catches zero-day botnets and structural anomalies that easily evade standard commercial firewalls.
*   **Scalable Operational Efficiency:** 
    *   Achieves a highly bounded, deterministic throughput target (1,500+ Flows/Sec). Because the ML pipeline relies purely on numeric vectors rather than computationally expensive payload parsing, it can be horizontally scaled across Kubernetes pods to handle massive backbone traffic at a fraction of the cost of commercial hardware.
*   **Future Scope:**
    *   Native integration with OT/ICS specific protocols (e.g., Modbus, DNP3).
    *   Hardware acceleration (FPGAs) for the Graph Neural Network to achieve 10Gbps+ line-rate inference.
