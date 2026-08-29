from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class EvidenceItem:
    feature: str
    value: float

@dataclass
class AlertRecord:
    alert_id: str
    timestamp: str
    flow_id: str
    threat_class: str
    severity: str
    confidence: float
    source: str
    destination: str
    model: str
    evidence: List[EvidenceItem] = field(default_factory=list)
    status: str = "NEW"
