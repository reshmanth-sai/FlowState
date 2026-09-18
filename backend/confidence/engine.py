"""Confidence and Uncertainty Gating Engine for Flowstate.

Complies with Section 12 & Section 38 of Master Specification:
- Multi-factor confidence calculation combining:
    1. Sensor quality & completeness
    2. Modality availability (wearable vs behaviour vs fused)
    3. Sample stability & temporal consistency
- Strictly gates state estimations:
    * PASS: Robust evidence, full adaptation eligible.
    * DEGRADED: Partial/noisy evidence, conservative adaptation only with UI warning.
    * INSUFFICIENT: Inadequate evidence, no strong state claims, suppress interventions.
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple
from backend.domain.models import FeatureVector, QualityGate


class ConfidenceEngine:
    def __init__(
        self,
        pass_threshold: float = 0.70,
        degraded_threshold: float = 0.45,
    ):
        self.pass_threshold = pass_threshold
        self.degraded_threshold = degraded_threshold

    def calculate_confidence_and_gate(
        self,
        fv: FeatureVector,
        target_state: str = "workload",
    ) -> Tuple[float, QualityGate]:
        """Compute multi-factor confidence and assign quality gate."""
        mask = fv.availability_mask
        quality = fv.quality_summary

        hr_available = mask.get("heart_rate", False)
        mot_available = mask.get("motion", False)
        task_available = mask.get("task_behaviour", False)

        # 1. Modality Completeness Score
        available_count = sum([1 for m in [hr_available, mot_available, task_available] if m])
        if available_count == 0:
            return 0.1, QualityGate.INSUFFICIENT

        modality_score = available_count / 3.0  # Max 1.0 for multimodal fusion

        # 2. Raw Signal Quality Score
        hr_quality = quality.get("heart_rate", 0.0)
        quality_score = hr_quality if hr_available else 0.7  # Default if task-only

        # 3. Contextual stability & sample sufficiency
        features = fv.features
        sample_penalty = 0.0
        if target_state == "workload":
            # Workload relies strongly on task performance and/or HR
            if not task_available and not hr_available:
                return 0.2, QualityGate.INSUFFICIENT
            if features.get("task_response_time_mean") is None and not hr_available:
                sample_penalty += 0.25
        elif target_state == "fatigue":
            # Fatigue relies on time-on-task and performance variability
            if features.get("time_on_task_seconds", 0) < 60.0:
                sample_penalty += 0.15

        # Composite confidence calculation
        raw_conf = (modality_score * 0.5) + (quality_score * 0.5) - sample_penalty
        final_conf = max(0.05, min(0.98, raw_conf))

        # Gate assignment
        if final_conf >= self.pass_threshold and available_count >= 2:
            gate = QualityGate.PASS
        elif final_conf >= self.degraded_threshold:
            gate = QualityGate.DEGRADED
        else:
            gate = QualityGate.INSUFFICIENT

        return round(final_conf, 2), gate
