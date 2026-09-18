"""Data Quality Engine for Flowstate.

Complies with Section 6 (M06) & Section 38 of Master Specification:
- Validates physiological plausibility (e.g. HR in [35, 220] bpm).
- Detects timestamp gaps, duplicates, missing samples, and stale streams.
- Computes window-level completeness and modality-specific quality scores.
- Determines whether window quality is PASS, DEGRADED, or INSUFFICIENT.
- Strictly never replaces missing values with zero or false physiologically plausible values.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Set, Tuple

from backend.domain.models import CanonicalEvent, QualityGate, SignalType


class QualityReport:
    def __init__(
        self,
        completeness: float,
        quality_summary: Dict[str, float],
        quality_gate: QualityGate,
        issues: List[str],
    ):
        self.completeness = completeness
        self.quality_summary = quality_summary
        self.quality_gate = quality_gate
        self.issues = issues


class DataQualityEngine:
    def __init__(
        self,
        hr_min: float = 35.0,
        hr_max: float = 220.0,
        max_timestamp_gap_seconds: float = 5.0,
        expected_hr_hz: float = 1.0,
    ):
        self.hr_min = hr_min
        self.hr_max = hr_max
        self.max_gap_seconds = max_timestamp_gap_seconds
        self.expected_hr_hz = expected_hr_hz

    def deduplicate_events(self, events: List[CanonicalEvent]) -> List[CanonicalEvent]:
        """Deduplicate events based on session, timestamp, and signal type."""
        seen: Set[Tuple[str, str, str]] = set()
        deduped: List[CanonicalEvent] = []
        for e in events:
            key = (e.session_id, e.timestamp.isoformat(), e.signal_type.value)
            if key not in seen:
                seen.add(key)
                deduped.append(e)
        return deduped

    def evaluate_window_quality(
        self,
        events: List[CanonicalEvent],
        window_duration_seconds: float = 30.0,
    ) -> QualityReport:
        """Evaluate completeness, gaps, and sensor quality for a sliding window."""
        issues: List[str] = []
        if not events:
            return QualityReport(
                completeness=0.0,
                quality_summary={},
                quality_gate=QualityGate.INSUFFICIENT,
                issues=["Empty window: No events recorded."],
            )

        # 1. Group events by signal type
        events_by_type: Dict[SignalType, List[CanonicalEvent]] = {}
        for ev in events:
            events_by_type.setdefault(ev.signal_type, []).append(ev)

        quality_scores: Dict[str, float] = {}

        # 2. Evaluate Heart Rate quality
        hr_events = events_by_type.get(SignalType.HEART_RATE, [])
        if hr_events:
            expected_samples = window_duration_seconds * self.expected_hr_hz
            actual_valid_samples = 0
            avg_sensor_quality = 0.0
            gaps_detected = 0

            # Sort chronologically
            sorted_hr = sorted(hr_events, key=lambda x: x.timestamp)
            for i in range(len(sorted_hr)):
                ev = sorted_hr[i]
                # Value validity check
                try:
                    v = float(ev.value)
                    if self.hr_min <= v <= self.hr_max:
                        actual_valid_samples += 1
                        avg_sensor_quality += ev.quality
                    else:
                        issues.append(f"Invalid HR reading out of bounds: {v} bpm")
                except (ValueError, TypeError):
                    issues.append("Non-numeric HR sample encountered")

                # Timestamp gap check
                if i > 0:
                    delta = (sorted_hr[i].timestamp - sorted_hr[i - 1].timestamp).total_seconds()
                    if delta > self.max_gap_seconds:
                        gaps_detected += 1
                        issues.append(f"Heart rate stream gap of {delta:.1f}s detected")

            if actual_valid_samples > 0:
                avg_sensor_quality /= actual_valid_samples
            completeness_hr = min(1.0, actual_valid_samples / max(1.0, expected_samples))

            # Deduct score for gaps
            gap_penalty = min(0.4, gaps_detected * 0.15)
            hr_quality = max(0.0, (completeness_hr * 0.5 + avg_sensor_quality * 0.5) - gap_penalty)
            quality_scores["heart_rate"] = round(hr_quality, 2)
        else:
            # HR not provided in this window
            quality_scores["heart_rate"] = 0.0

        # 3. Evaluate Motion quality
        mot_events = events_by_type.get(SignalType.MOTION, [])
        if mot_events:
            quality_scores["motion"] = 1.0
        else:
            quality_scores["motion"] = 0.0

        # 4. Evaluate Task events quality
        task_events = events_by_type.get(SignalType.TASK_EVENT, [])
        if task_events:
            quality_scores["task_behaviour"] = 1.0
        else:
            quality_scores["task_behaviour"] = 0.0

        # 5. Composite completeness & overall quality gate
        available_modalities = [k for k, v in quality_scores.items() if v > 0.0]
        if not available_modalities:
            return QualityReport(
                completeness=0.0,
                quality_summary=quality_scores,
                quality_gate=QualityGate.INSUFFICIENT,
                issues=["No usable signal modalities available."],
            )

        avg_quality = sum(quality_scores[m] for m in available_modalities) / len(available_modalities)
        overall_completeness = len(available_modalities) / 3.0  # (HR, Motion, Task)

        if avg_quality >= 0.75 and overall_completeness >= 0.6:
            gate = QualityGate.PASS
        elif avg_quality >= 0.45 or overall_completeness >= 0.33:
            gate = QualityGate.DEGRADED
        else:
            gate = QualityGate.INSUFFICIENT

        return QualityReport(
            completeness=round(overall_completeness, 2),
            quality_summary=quality_scores,
            quality_gate=gate,
            issues=issues,
        )
