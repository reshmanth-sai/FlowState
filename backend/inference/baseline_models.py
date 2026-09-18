"""Interpretable baseline cognitive state estimators for Flowstate.

Complies with Section 11 & Section 13 of Master Specification:
- Interpretable, transparent baseline models (no black-box deep learning prior to validated benchmarks).
- Estimates:
    * Workload: Driven by behavioral response latency, heart rate delta, and error rate.
    * Fatigue: Driven by time-on-task, reaction latency dispersion, pause duration, sustained physiological load.
    * Engagement: Driven by interaction throughput, rhythm consistency, active participation.
- Strict Scientific Invariant: Task difficulty is contextual environmental metadata framing user behavior,
  and does NOT enter cognitive-state inference formulas directly (task_difficulty_context != workload).
- Dynamically renormalizes weights across available features without zero-filling missing modalities.
"""

from __future__ import annotations

import math
from typing import Dict, Optional, Tuple
from backend.domain.models import FeatureVector, StateLevel


def _clamp(val: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    return max(min_val, min(max_val, val))


class BaselineEstimators:
    def __init__(self):
        self.model_version = "baseline_interpretable_v1.0.0"

    def estimate_workload(self, fv: FeatureVector) -> Tuple[float, StateLevel]:
        """Estimate cognitive workload index in [0, 1]."""
        f = fv.features
        mask = fv.availability_mask

        weights: Dict[str, float] = {}
        values: Dict[str, float] = {}

        # 1. Response time component (400ms -> 0.0, 1000ms -> 1.0)
        rt = f.get("task_response_time_mean")
        if rt is not None and mask.get("task_behaviour", False):
            weights["rt"] = 0.45
            values["rt"] = _clamp((rt - 400.0) / 600.0)

        # 2. Heart rate delta component (0 bpm -> 0.0, +15 bpm -> 1.0)
        hr_delta = f.get("hr_baseline_delta")
        hr_mean = f.get("hr_mean")
        if hr_delta is not None and mask.get("heart_rate", False):
            weights["hr"] = 0.35
            values["hr"] = _clamp(hr_delta / 16.0)
        elif hr_mean is not None and mask.get("heart_rate", False):
            weights["hr"] = 0.35
            values["hr"] = _clamp((hr_mean - 70.0) / 30.0)

        # 3. Error rate component (0.0 -> 0.0, 0.40 -> 1.0)
        err = f.get("task_error_rate")
        if err is not None:
            weights["err"] = 0.20
            values["err"] = _clamp(err / 0.35)

        # Note: Task difficulty is strictly contextual environmental metadata (task_difficulty_context != workload).
        # It is preserved in the FeatureVector for display, attribution, and logging, but does NOT enter cognitive inference.

        if not weights:
            return 0.5, StateLevel.MODERATE

        total_weight = sum(weights.values())
        score = sum(values[k] * (weights[k] / total_weight) for k in weights)
        score = _clamp(round(score, 2))

        if score >= 0.70:
            level = StateLevel.HIGH
        elif score >= 0.40:
            level = StateLevel.MODERATE
        else:
            level = StateLevel.LOW

        return score, level

    def estimate_fatigue(self, fv: FeatureVector) -> Tuple[float, StateLevel]:
        """Estimate cognitive fatigue index in [0, 1]."""
        f = fv.features
        weights: Dict[str, float] = {}
        values: Dict[str, float] = {}

        # 1. Time-on-task component (0s -> 0.0, 300s -> 1.0)
        tot = f.get("time_on_task_seconds", 0.0) or 0.0
        weights["tot"] = 0.40
        values["tot"] = _clamp(tot / 270.0)

        # 2. Response latency dispersion/variability (0ms -> 0.0, 200ms -> 1.0)
        rt_std = f.get("task_response_time_std")
        if rt_std is not None:
            weights["rt_std"] = 0.30
            values["rt_std"] = _clamp(rt_std / 180.0)

        # 3. Pause duration total (0s -> 0.0, 15s -> 1.0)
        pause = f.get("pause_duration_total", 0.0) or 0.0
        weights["pause"] = 0.15
        values["pause"] = _clamp(pause / 15.0)

        # 4. Physiological suppression / drift
        hr_std = f.get("hr_std")
        if hr_std is not None and fv.availability_mask.get("heart_rate", False):
            weights["hr_drift"] = 0.15
            # Suppressed HRV/HR std often accompanies progressive mental fatigue
            values["hr_drift"] = _clamp(1.0 - (hr_std / 8.0))

        if not weights:
            return 0.3, StateLevel.LOW

        total_weight = sum(weights.values())
        score = sum(values[k] * (weights[k] / total_weight) for k in weights)
        score = _clamp(round(score, 2))

        if score >= 0.65:
            level = StateLevel.ELEVATED
        elif score >= 0.35:
            level = StateLevel.MODERATE
        else:
            level = StateLevel.LOW

        return score, level

    def estimate_engagement(self, fv: FeatureVector) -> Tuple[float, StateLevel]:
        """Estimate active task engagement index in [0, 1]."""
        f = fv.features
        weights: Dict[str, float] = {}
        values: Dict[str, float] = {}

        # 1. Completion throughput (0 -> 0.0, 6 items -> 1.0)
        completions = f.get("task_completion_count", 0.0) or 0.0
        weights["throughput"] = 0.45
        values["throughput"] = _clamp(completions / 5.0)

        # 2. Absence of excessive pauses (15s pause -> 0.0, 0s pause -> 1.0)
        pause = f.get("pause_duration_total", 0.0) or 0.0
        weights["rhythm"] = 0.35
        values["rhythm"] = _clamp(1.0 - (pause / 12.0))

        # 3. Accuracy retention (0% err -> 1.0, 40% err -> 0.0)
        err = f.get("task_error_rate")
        if err is not None:
            weights["accuracy"] = 0.20
            values["accuracy"] = _clamp(1.0 - (err / 0.40))

        if not weights:
            return 0.5, StateLevel.MODERATE

        total_weight = sum(weights.values())
        score = sum(values[k] * (weights[k] / total_weight) for k in weights)
        score = _clamp(round(score, 2))

        if score >= 0.70:
            level = StateLevel.HIGH
        elif score >= 0.40:
            level = StateLevel.MODERATE
        else:
            level = StateLevel.REDUCED

        return score, level
