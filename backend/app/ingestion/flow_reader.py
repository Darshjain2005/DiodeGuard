import csv
import uuid
from typing import Generator
from datetime import datetime

from app.schemas.flow import FlowRecord

def _safe_float(val: str, default: float = 0.0) -> float:
    try:
        if val.strip() == '' or 'Infinity' in val or 'inf' in val:
            return default
        return float(val)
    except:
        return default

def _safe_int(val: str, default: int = 0) -> int:
    try:
        return int(float(val))
    except:
        return default

class FlowReader:
    def __init__(self, filepath: str):
        self.filepath = filepath

    def stream_flows(self) -> Generator[FlowRecord, None, None]:
        with open(self.filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            # Strip whitespace from header names
            reader.fieldnames = [name.strip() for name in reader.fieldnames]

            for row in reader:
                # Basic Mapping for CIC-IDS2017
                duration = _safe_float(row.get('Flow Duration', 0))
                
                # In CIC-IDS2017, there is no direct Src IP and Dst IP in some normalized versions
                # We will mock or extract them if they exist
                src_ip = row.get('Source IP', '0.0.0.0')
                dst_ip = row.get('Destination IP', '0.0.0.0')
                src_port = _safe_int(row.get('Source Port', 0))
                dst_port = _safe_int(row.get('Destination Port', 0))
                protocol = _safe_int(row.get('Protocol', 0))
                
                # Construct raw features dictionary for legacy SentinelX support
                raw_features = {}
                for k, v in row.items():
                    # Attempt to store everything as float for the ML model
                    try:
                        raw_features[k] = _safe_float(v)
                    except:
                        pass
                
                # Create FlowRecord
                flow = FlowRecord(
                    timestamp=datetime.utcnow().isoformat() + "Z",
                    flow_id=str(uuid.uuid4()),
                    src_ip=src_ip,
                    dst_ip=dst_ip,
                    src_port=src_port,
                    dst_port=dst_port,
                    protocol=protocol,
                    duration=duration,
                    packets_forward=_safe_int(row.get('Total Fwd Packets', 0)),
                    packets_backward=_safe_int(row.get('Total Backward Packets', 0)),
                    bytes_forward=_safe_int(row.get('Total Length of Fwd Packets', 0)),
                    bytes_backward=_safe_int(row.get('Total Length of Bwd Packets', 0)),
                    packet_size_mean=_safe_float(row.get('Packet Length Mean', 0)),
                    packet_size_std=_safe_float(row.get('Packet Length Std', 0)),
                    inter_arrival_mean=_safe_float(row.get('Flow IAT Mean', 0)),
                    inter_arrival_std=_safe_float(row.get('Flow IAT Std', 0)),
                    raw_features=raw_features
                )
                yield flow
