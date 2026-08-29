import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.ingestion.flow_reader import FlowReader

def main():
    dataset_path = r"d:\projects\DiodeGuard\datasets\combinenew.csv"
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}")
        return

    reader = FlowReader(dataset_path)
    
    print("Reading first 5 flows...")
    count = 0
    for flow in reader.stream_flows():
        print(f"Flow ID: {flow.flow_id}")
        print(f"Duration: {flow.duration}")
        print(f"Fwd Packets: {flow.packets_forward}")
        print(f"Raw Features count: {len(flow.raw_features)}")
        print("-" * 40)
        count += 1
        if count >= 5:
            break

if __name__ == '__main__':
    main()
