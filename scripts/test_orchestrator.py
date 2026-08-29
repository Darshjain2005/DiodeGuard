import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.ingestion.flow_reader import FlowReader
from app.orchestrator import DiodeGuardOrchestrator

def main():
    dataset_path = r"d:\projects\DiodeGuard\datasets\combinenew.csv"
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}")
        return

    reader = FlowReader(dataset_path)
    orchestrator = DiodeGuardOrchestrator(dataset_path)
    
    print("Reading and processing first 100 flows...")
    count = 0
    for flow in reader.stream_flows():
        orchestrator.process_flow(flow)
        count += 1
        if count >= 100:
            break

if __name__ == '__main__':
    main()
