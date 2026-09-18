"""Personalization Engine for Flowstate.

Complies with Section 6 (M17) & Section 15 of Master Specification:
- Stores calibrated individual baselines (resting heart rate, baseline reaction latency).
- Computes baseline-relative delta features to avoid assuming identical physiological baselines across individuals.
- Strictly keeps baseline calibration independent from evaluation target labels (no target leakage).
"""

from __future__ import annotations

import statistics
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.domain.models import BaselineProfile, CanonicalEvent, SignalType


class PersonalizationEngine:
    def __init__(self):
        # In-memory participant baseline store: participant_key -> BaselineProfile
        self._baselines: Dict[str, BaselineProfile] = {}

    def get_baseline(self, participant_key: str) -> Optional[BaselineProfile]:
        return self._baselines.get(participant_key)

    def set_baseline(self, baseline: BaselineProfile) -> BaselineProfile:
        self._baselines[baseline.participant_key] = baseline
        return baseline

    def calibrate_baseline_from_events(
        self, participant_key: str, baseline_events: List[CanonicalEvent]
    ) -> BaselineProfile:
        """Derive an initial personal baseline from dedicated calibration window events."""
        hr_vals = [
            float(e.value) for e in baseline_events
            if e.signal_type == SignalType.HEART_RATE and isinstance(e.value, (int, float))
        ]
        task_rts = [
            float(e.value.get("response_time_ms", 0))
            for e in baseline_events
            if e.signal_type == SignalType.TASK_EVENT and isinstance(e.value, dict) and "response_time_ms" in e.value
        ]

        mean_hr = statistics.mean(hr_vals) if hr_vals else 72.0
        std_hr = statistics.stdev(hr_vals) if len(hr_vals) > 1 else 3.5

        mean_rt = statistics.mean(task_rts) if task_rts else 420.0
        std_rt = statistics.stdev(task_rts) if len(task_rts) > 1 else 60.0

        profile = BaselineProfile(
            baseline_id=f"base_{uuid.uuid4().hex[:10]}",
            participant_key=participant_key,
            created_at=datetime.now(timezone.utc),
            window_count=max(1, len(hr_vals) // 30),
            hr_mean=round(mean_hr, 1),
            hr_std=round(std_hr, 2),
            response_time_mean=round(mean_rt, 1),
            response_time_std=round(std_rt, 2),
            status="CALIBRATED",
        )
        self._baselines[participant_key] = profile
        return profile

    def compute_deltas(
        self,
        participant_key: str,
        current_hr_mean: Optional[float],
        current_rt_mean: Optional[float],
    ) -> Dict[str, Optional[float]]:
        """Compute differences relative to participant baseline."""
        baseline = self.get_baseline(participant_key)
        deltas: Dict[str, Optional[float]] = {
            "hr_baseline_delta": None,
            "response_time_baseline_delta": None,
        }

        if baseline and current_hr_mean is not None:
            deltas["hr_baseline_delta"] = round(current_hr_mean - baseline.hr_mean, 2)

        if baseline and current_rt_mean is not None:
            deltas["response_time_baseline_delta"] = round(current_rt_mean - baseline.response_time_mean, 2)

        return deltas
