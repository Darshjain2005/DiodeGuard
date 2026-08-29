from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

@dataclass
class FlowRecord:
    timestamp: str
    flow_id: str
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    protocol: Optional[int] = None
    duration: float = 0.0
    packets_forward: int = 0
    packets_backward: int = 0
    bytes_forward: int = 0
    bytes_backward: int = 0
    packet_size_mean: float = 0.0
    packet_size_std: float = 0.0
    inter_arrival_mean: float = 0.0
    inter_arrival_std: float = 0.0
    tcp_flags: Optional[str] = None
    dns_query: Optional[str] = None
    dns_record_type: Optional[str] = None
    tls_fingerprint: Optional[str] = None
    tls_version: Optional[str] = None
    direction: Optional[str] = None
    raw_features: Dict[str, float] = field(default_factory=dict)
