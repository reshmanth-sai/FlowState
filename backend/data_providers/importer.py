"""Data provider for imported datasets and recorded sessions.

Complies with Section 8 & Section 36 of Master Specification:
- Imports CSV or JSON records.
- Enforces strict CanonicalEvent schema validation.
- Preserves explicit SourceType.IMPORTED labeling.
"""

from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.data_providers.base import DataProvider
from backend.domain.models import CanonicalEvent, SignalType, SourceType


class ImportProvider(DataProvider):
    def __init__(self, raw_content: str, file_format: str = "json", dataset_name: str = "Imported Dataset"):
        self.raw_content = raw_content
        self.file_format = file_format.lower()
        self.dataset_name = dataset_name
        self._connected = True

    @property
    def provider_id(self) -> str:
        return f"import_{self.dataset_name.lower().replace(' ', '_')}"

    @property
    def source_type(self) -> SourceType:
        return SourceType.IMPORTED

    async def connect(self) -> bool:
        self._connected = True
        return True

    async def disconnect(self) -> None:
        self._connected = False

    async def health(self) -> Dict[str, Any]:
        return {
            "status": "READY" if self._connected else "DISCONNECTED",
            "provider_id": self.provider_id,
            "source_type": self.source_type.value,
            "dataset_name": self.dataset_name,
        }

    def capabilities(self) -> Dict[str, Any]:
        return {
            "signals": ["heart_rate", "motion", "task_event", "self_report"],
            "format": self.file_format,
            "is_simulation": False,
        }

    async def generate_events(
        self, session_id: str, start_time: datetime, duration_seconds: float = 0.0
    ) -> List[CanonicalEvent]:
        events: List[CanonicalEvent] = []
        if self.file_format == "json":
            data = json.loads(self.raw_content)
            items = data if isinstance(data, list) else data.get("events", [])
            for item in items:
                ts = datetime.fromisoformat(item["timestamp"])
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)

                sig_type = SignalType(item.get("signal_type", "heart_rate"))
                events.append(
                    CanonicalEvent(
                        id=item.get("id") or f"evt_imp_{uuid.uuid4().hex[:10]}",
                        session_id=session_id,
                        timestamp=ts,
                        source_type=SourceType.IMPORTED,
                        source_device=item.get("source_device") or self.dataset_name,
                        signal_type=sig_type,
                        value=item.get("value", 0.0),
                        unit=item.get("unit", ""),
                        quality=float(item.get("quality", 1.0)),
                        metadata=item.get("metadata", {}),
                    )
                )
        elif self.file_format == "csv":
            reader = csv.DictReader(io.StringIO(self.raw_content))
            for row in reader:
                ts = datetime.fromisoformat(row["timestamp"])
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)

                val_raw = row["value"]
                try:
                    val: Any = float(val_raw)
                except ValueError:
                    val = val_raw

                events.append(
                    CanonicalEvent(
                        id=row.get("id") or f"evt_imp_{uuid.uuid4().hex[:10]}",
                        session_id=session_id,
                        timestamp=ts,
                        source_type=SourceType.IMPORTED,
                        source_device=row.get("source_device") or self.dataset_name,
                        signal_type=SignalType(row["signal_type"]),
                        value=val,
                        unit=row.get("unit", ""),
                        quality=float(row.get("quality", 1.0)),
                        metadata={},
                    )
                )
        return events
