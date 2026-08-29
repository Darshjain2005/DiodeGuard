from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.schemas.alert import AlertRecord, EvidenceItem

class AlertGenerator:
    @staticmethod
    def generate_alert(
        flow_id: str,
        threat_class: str,
        severity: str,
        confidence: float,
        source: str,
        destination: str,
        evidence_dict: Dict[str, float],
        model: str
    ) -> AlertRecord:
        
        evidence_items = [
            EvidenceItem(feature=k, value=v) for k, v in evidence_dict.items()
        ]
        
        alert = AlertRecord(
            alert_id=f"ALT-{str(uuid.uuid4())[:8].upper()}",
            timestamp=datetime.utcnow().isoformat() + "Z",
            flow_id=flow_id,
            threat_class=threat_class,
            severity=severity,
            confidence=confidence,
            source=source,
            destination=destination,
            evidence=evidence_items,
            model=model,
            status="NEW"
        )
        return alert
