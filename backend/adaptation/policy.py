"""Closed-loop Adaptation Policy for Flowstate.

Complies with Section 6 (M14) & Section 14 of Master Specification:
- Intervention triggers are configurable and bounded to productivity/learning actions:
    * SUGGEST_SHORT_BREAK: Micro-recovery pause during sustained high load or fatigue.
    * REDUCE_DIFFICULTY: Dial down task complexity when workload and errors surge.
    * PACING_ADJUSTMENT: Soften question presentation tempo.
    * ATTENTION_PROMPT: Gentle nudge to re-engage during attentional dips.
- Enforces strict hysteresis and cooldowns (default 120s) to prevent UI thrashing.
- Quality Gate Gating & Threshold Relationship:
    * PASS (confidence >= 0.70 & >= 2 modalities): Full adaptation eligible.
    * DEGRADED (0.45 <= confidence < 0.70 or single-modality): Conservative adaptation
      may occur under DEGRADED evidence quality when the policy-specific minimum confidence
      requirement (>= 0.65) is satisfied.
    * INSUFFICIENT (confidence < 0.45): Interventions are strictly suppressed.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from backend.domain.models import (
    AdaptationAction,
    AdaptationDecision,
    InferenceOutput,
    InterventionStatus,
    QualityGate,
    StateLevel,
)


class AdaptationPolicy:
    def __init__(
        self,
        cooldown_seconds: int = 120,
        workload_break_threshold: float = 0.70,
        fatigue_break_threshold: float = 0.65,
        min_confidence_for_action: float = 0.65,
    ):
        self.cooldown_seconds = cooldown_seconds
        self.workload_break_threshold = workload_break_threshold
        self.fatigue_break_threshold = fatigue_break_threshold
        self.min_confidence_for_action = min_confidence_for_action

    def evaluate(
        self,
        current_inference: InferenceOutput,
        recent_interventions: List[AdaptationDecision],
    ) -> Optional[AdaptationDecision]:
        """Evaluate whether an explainable, bounded intervention should be offered."""
        # 1. Quality Gate Check: strictly suppress if evidence is INSUFFICIENT
        if current_inference.quality_gate == QualityGate.INSUFFICIENT:
            return None

        now = current_inference.created_at
        is_degraded = current_inference.quality_gate == QualityGate.DEGRADED

        # 2. Cooldown Check (prevent oscillation)
        for past in reversed(recent_interventions):
            delta = (now - past.timestamp).total_seconds()
            if delta < self.cooldown_seconds and past.status in [InterventionStatus.OFFERED, InterventionStatus.ACCEPTED]:
                return None

        # 3. High Cognitive Workload Trigger
        wl = current_inference.workload
        if wl.value >= self.workload_break_threshold and wl.confidence >= self.min_confidence_for_action:
            import uuid
            reason = (
                "Conservative adaptation based on limited available evidence (DEGRADED quality). "
                "Elevated cognitive workload pattern observed; offering an optional 60-second recovery pause."
                if is_degraded
                else "Elevated cognitive workload pattern estimated across multimodal evidence. "
                "A brief 60-second recovery pause is recommended."
            )
            return AdaptationDecision(
                intervention_id=f"int_{uuid.uuid4().hex[:10]}",
                session_id=current_inference.session_id,
                timestamp=now,
                action=AdaptationAction.SUGGEST_SHORT_BREAK,
                reason=reason,
                trigger_state="WORKLOAD",
                trigger_estimate=wl.value,
                confidence_requirement=self.min_confidence_for_action,
                cooldown_seconds=self.cooldown_seconds,
                status=InterventionStatus.OFFERED,
                metadata={
                    "state_level": wl.level.value,
                    "confidence": wl.confidence,
                    "quality_gate": current_inference.quality_gate.value,
                    "is_conservative": is_degraded,
                },
            )

        # 4. Elevated Fatigue Trigger
        ft = current_inference.fatigue
        if ft.value >= self.fatigue_break_threshold and ft.confidence >= self.min_confidence_for_action:
            import uuid
            reason = (
                "Conservative adaptation based on limited available evidence (DEGRADED quality). "
                "Mental fatigue trend indicated over extended time-on-task; recommending a temporary difficulty reduction."
                if is_degraded
                else "Estimated mental fatigue observed over extended time-on-task. "
                "Recommending a temporary difficulty reduction."
            )
            return AdaptationDecision(
                intervention_id=f"int_{uuid.uuid4().hex[:10]}",
                session_id=current_inference.session_id,
                timestamp=now,
                action=AdaptationAction.REDUCE_DIFFICULTY,
                reason=reason,
                trigger_state="FATIGUE",
                trigger_estimate=ft.value,
                confidence_requirement=self.min_confidence_for_action,
                cooldown_seconds=self.cooldown_seconds,
                status=InterventionStatus.OFFERED,
                metadata={
                    "state_level": ft.level.value,
                    "confidence": ft.confidence,
                    "quality_gate": current_inference.quality_gate.value,
                    "is_conservative": is_degraded,
                },
            )

        # 5. Low Engagement Trigger
        eg = current_inference.engagement
        if eg.value < 0.35 and eg.confidence >= self.min_confidence_for_action:
            import uuid
            reason = (
                "Conservative adaptation based on limited available evidence (DEGRADED quality). "
                "Interaction rhythm has slowed; prompting with an interactive challenge variation."
                if is_degraded
                else "Interaction rhythm has slowed noticeably. "
                "Prompting with an interactive challenge variation to re-engage attention."
            )
            return AdaptationDecision(
                intervention_id=f"int_{uuid.uuid4().hex[:10]}",
                session_id=current_inference.session_id,
                timestamp=now,
                action=AdaptationAction.ATTENTION_PROMPT,
                reason=reason,
                trigger_state="ENGAGEMENT",
                trigger_estimate=eg.value,
                confidence_requirement=self.min_confidence_for_action,
                cooldown_seconds=self.cooldown_seconds,
                status=InterventionStatus.OFFERED,
                metadata={
                    "state_level": eg.level.value,
                    "confidence": eg.confidence,
                    "quality_gate": current_inference.quality_gate.value,
                    "is_conservative": is_degraded,
                },
            )

        return None
