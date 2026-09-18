"""Cognitive State Inference Engine for Flowstate.

Complies with Section 6 (M11 & M12), Section 11, & Section 13 of Master Specification:
- Produces estimated workload, fatigue, and engagement states.
- Applies confidence and quality gating (PASS, DEGRADED, INSUFFICIENT).
- Attaches non-causal evidence explanations for Follow-the-Signal traceability.
- Completely decouples ML inference from frontend rendering.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.confidence.engine import ConfidenceEngine
from backend.domain.models import (
    FeatureVector,
    InferenceOutput,
    QualityGate,
    StateEstimate,
    StateLevel,
)
from backend.explanation.engine import ExplanationEngine
from backend.inference.baseline_models import BaselineEstimators


class InferenceEngine:
    def __init__(
        self,
        estimators: Optional[BaselineEstimators] = None,
        confidence_engine: Optional[ConfidenceEngine] = None,
        explanation_engine: Optional[ExplanationEngine] = None,
    ):
        self.estimators = estimators or BaselineEstimators()
        self.confidence_engine = confidence_engine or ConfidenceEngine()
        self.explanation_engine = explanation_engine or ExplanationEngine()

    def run_inference(self, fv: FeatureVector) -> InferenceOutput:
        """Run cognitive state estimation pipeline on a feature vector."""
        # 1. State estimation via transparent baseline estimators
        workload_score, workload_level = self.estimators.estimate_workload(fv)
        fatigue_score, fatigue_level = self.estimators.estimate_fatigue(fv)
        engagement_score, engagement_level = self.estimators.estimate_engagement(fv)

        # 2. Multi-factor confidence gating
        workload_conf, wl_gate = self.confidence_engine.calculate_confidence_and_gate(fv, "workload")
        fatigue_conf, ft_gate = self.confidence_engine.calculate_confidence_and_gate(fv, "fatigue")
        eng_conf, eg_gate = self.confidence_engine.calculate_confidence_and_gate(fv, "engagement")

        # Overall composite gate (most restrictive)
        if QualityGate.INSUFFICIENT in [wl_gate, ft_gate, eg_gate]:
            overall_gate = QualityGate.INSUFFICIENT
        elif QualityGate.DEGRADED in [wl_gate, ft_gate, eg_gate]:
            overall_gate = QualityGate.DEGRADED
        else:
            overall_gate = QualityGate.PASS

        # 3. Evidence extraction for Follow-the-Signal
        evidence = self.explanation_engine.generate_evidence(
            fv,
            workload_val=workload_score,
            fatigue_val=fatigue_score,
            engagement_val=engagement_score,
        )

        return InferenceOutput(
            inference_id=f"inf_{fv.window_id}",
            session_id=fv.session_id,
            window_id=fv.window_id,
            workload=StateEstimate(
                value=workload_score,
                confidence=workload_conf,
                level=workload_level,
            ),
            fatigue=StateEstimate(
                value=fatigue_score,
                confidence=fatigue_conf,
                level=fatigue_level,
            ),
            engagement=StateEstimate(
                value=engagement_score,
                confidence=eng_conf,
                level=engagement_level,
            ),
            quality_gate=overall_gate,
            evidence=evidence,
            model_version=self.estimators.model_version,
            created_at=datetime.now(timezone.utc),
        )
