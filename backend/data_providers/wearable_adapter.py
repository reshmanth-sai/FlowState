"""Pluggable adapter boundary for consumer wearables (Apple Watch / Garmin / Polar BLE).

Complies with Section 4 of Master Specification:
- Smartwatch heart rate is PPG-derived heart rate, never claimed as ECG waveform.
- Smartwatch motion is physical movement intensity, never claimed as cognitive state.
- Strictly rejects any EEG or fNIRS claims from consumer wearables.
- All real device data is tagged with SourceType.REAL_WEARABLE.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.data_providers.base import DataProvider
from backend.domain.models import CanonicalEvent, SignalType, SourceType


class WearableAdapter(DataProvider):
    def __init__(self, device_id: str, device_model: str = "Consumer Smartwatch"):
        self.device_id = device_id
        self.device_model = device_model
        self._connected = False
        self._dropped_samples = 0

    @property
    def provider_id(self) -> str:
        return f"wearable_{self.device_id}"

    @property
    def source_type(self) -> SourceType:
        return SourceType.REAL_WEARABLE

    async def connect(self) -> bool:
        self._connected = True
        return True

    async def disconnect(self) -> None:
        self._connected = False

    async def health(self) -> Dict[str, Any]:
        return {
            "status": "CONNECTED" if self._connected else "DISCONNECTED",
            "provider_id": self.provider_id,
            "source_type": self.source_type.value,
            "device_model": self.device_model,
            "dropped_samples": self._dropped_samples,
        }

    def capabilities(self) -> Dict[str, Any]:
        return {
            "signals": ["heart_rate", "motion"],
            "supports_rr": False,
            "supports_eda": False,
            "device_model": self.device_model,
            "is_simulation": False,
        }

    def parse_payload(self, session_id: str, payload: Dict[str, Any]) -> Optional[CanonicalEvent]:
        """Convert a raw smartwatch payload into a CanonicalEvent with validation."""
        raw_signal = payload.get("signal_type", "").lower()
        if raw_signal in ["ecg", "eeg", "fnirs"]:
            # Scientific integrity safeguard: Reject unsupported medical modalities
            raise ValueError(f"Scientific boundary violation: Consumer wearable cannot claim {raw_signal.upper()}")

        if raw_signal not in ["heart_rate", "motion", "step_count"]:
            self._dropped_samples += 1
            return None

        val = payload.get("value")
        if val is None or not isinstance(val, (int, float)):
            self._dropped_samples += 1
            return None

        # Physiological plausibility validation
        if raw_signal == "heart_rate" and not (35.0 <= float(val) <= 220.0):
            self._dropped_samples += 1
            return None

        ts_raw = payload.get("timestamp")
        ts = datetime.fromisoformat(ts_raw) if ts_raw else datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        sig_type = SignalType.HEART_RATE if raw_signal == "heart_rate" else SignalType.MOTION
        unit = "bpm" if sig_type == SignalType.HEART_RATE else "g_intensity"

        return CanonicalEvent(
            id=f"evt_wear_{uuid.uuid4().hex[:10]}",
            session_id=session_id,
            timestamp=ts,
            source_type=SourceType.REAL_WEARABLE,
            source_device=f"{self.device_model} ({self.device_id})",
            signal_type=sig_type,
            value=float(val),
            unit=unit,
            quality=float(payload.get("quality", 1.0)),
            metadata=payload.get("metadata", {}),
        )

    async def generate_events(
        self, session_id: str, start_time: datetime, duration_seconds: float = 0.0
    ) -> List[CanonicalEvent]:
        return []
