"""Explanation Engine for Flowstate.

Complies with Section 6 (M13), Section 13, & Section 16.1 of Master Specification:
- Generates evidence attributions explaining cognitive state estimates.
- Strictly avoids claiming causal certainty ("Contributing evidence suggests...", "Associated with...").
- Enables the "Follow-the-Signal" backward trace from state estimate to raw observations.
"""

from __future__ import annotations

from typing import Any, Dict, List
from backend.domain.models import FeatureVector, StateLevel


class ExplanationEngine:
    def generate_evidence(
        self,
        fv: FeatureVector,
        workload_val: float,
        fatigue_val: float,
        engagement_val: float,
    ) -> List[Dict[str, Any]]:
        """Extract dominant evidence factors contributing to the state estimates."""
        evidence: List[Dict[str, Any]] = []
        features = fv.features

        # 1. Heart Rate Elevation Evidence
        hr_delta = features.get("hr_baseline_delta")
        hr_mean = features.get("hr_mean")
        if hr_delta is not None:
            if hr_delta > 5.0:
                evidence.append({
                    "factor": "Heart Rate vs Baseline",
                    "value": f"+{hr_delta:.1f} bpm",
                    "direction": "INCREASING",
                    "impact": "ELEVATED_WORKLOAD",
                    "attribution_text": f"Heart rate is {hr_delta:.1f} bpm above baseline, indicating physiological activation during demand.",
                })
            elif hr_delta < -3.0:
                evidence.append({
                    "factor": "Heart Rate vs Baseline",
                    "value": f"{hr_delta:.1f} bpm",
                    "direction": "DECREASING",
                    "impact": "REDUCED_AROUSAL",
                    "attribution_text": f"Heart rate is below baseline ({hr_delta:.1f} bpm), associated with recovery or reduced activation.",
                })
        elif hr_mean is not None and hr_mean > 85.0:
            evidence.append({
                "factor": "Heart Rate Level",
                "value": f"{hr_mean:.1f} bpm",
                "direction": "ELEVATED",
                "impact": "ELEVATED_WORKLOAD",
                "attribution_text": f"Elevated mean heart rate ({hr_mean:.1f} bpm) observed during active window.",
            })

        # 2. Behavioral Response Time Evidence
        rt_mean = features.get("task_response_time_mean")
        rt_delta = features.get("response_time_baseline_delta")
        if rt_delta is not None and rt_delta > 100.0:
            evidence.append({
                "factor": "Reaction Latency Delta",
                "value": f"+{rt_delta:.0f} ms",
                "direction": "INCREASING",
                "impact": "ELEVATED_WORKLOAD",
                "attribution_text": f"Task reaction time is {rt_delta:.0f} ms slower than baseline latency.",
            })
        elif rt_mean is not None and rt_mean > 600.0:
            evidence.append({
                "factor": "Response Time Latency",
                "value": f"{rt_mean:.0f} ms",
                "direction": "HIGH",
                "impact": "ELEVATED_WORKLOAD",
                "attribution_text": f"Response latency is prolonged ({rt_mean:.0f} ms), indicating higher mental processing demand.",
            })

        # 3. Error Rate Evidence
        err_rate = features.get("task_error_rate")
        if err_rate is not None and err_rate > 0.15:
            evidence.append({
                "factor": "Task Error Rate",
                "value": f"{err_rate * 100:.1f}%",
                "direction": "ELEVATED",
                "impact": "ELEVATED_WORKLOAD",
                "attribution_text": f"Task error rate is elevated at {err_rate * 100:.1f}%, indicating cognitive struggle or task overload.",
            })

        # 4. Time-on-Task Fatigue Accumulation
        tot = features.get("time_on_task_seconds")
        if tot is not None and tot > 120.0 and fatigue_val > 0.40:
            evidence.append({
                "factor": "Sustained Time-on-Task",
                "value": f"{tot:.0f} s",
                "direction": "ACCUMULATING",
                "impact": "FATIGUE_ACCUMULATION",
                "attribution_text": f"Sustained task engagement ({tot / 60.0:.1f} mins) associated with progressive cognitive fatigue accumulation.",
            })

        # 5. Engagement Evidence
        completion_cnt = features.get("task_completion_count", 0.0) or 0.0
        if completion_cnt >= 4.0:
            evidence.append({
                "factor": "Interaction Rhythm",
                "value": f"{int(completion_cnt)} items/win",
                "direction": "ACTIVE",
                "impact": "HIGH_ENGAGEMENT",
                "attribution_text": "Consistent item completions suggest active cognitive engagement with the task.",
            })

        if not evidence:
            evidence.append({
                "factor": "Stable Baseline Activity",
                "value": "Nominal",
                "direction": "STABLE",
                "impact": "BASELINE_STABLE",
                "attribution_text": "Signals and task metrics are currently within nominal baseline ranges.",
            })

        return evidence
