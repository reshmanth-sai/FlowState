"""Unit tests for Adaptation Policy and Cooldowns."""

from datetime import datetime, timedelta, timezone
from backend.adaptation.policy import AdaptationPolicy
from backend.domain.models import (
    AdaptationAction,
    AdaptationDecision,
    InferenceOutput,
    InterventionStatus,
    QualityGate,
    StateEstimate,
    StateLevel,
)


def test_adaptation_policy_triggers_on_high_workload():
    policy = AdaptationPolicy(cooldown_seconds=120)
    now = datetime.now(timezone.utc)

    inf = InferenceOutput(
        inference_id="inf_1",
        session_id="s_1",
        window_id="w_1",
        workload=StateEstimate(value=0.82, confidence=0.85, level=StateLevel.HIGH),
        fatigue=StateEstimate(value=0.30, confidence=0.80, level=StateLevel.LOW),
        engagement=StateEstimate(value=0.75, confidence=0.85, level=StateLevel.HIGH),
        quality_gate=QualityGate.PASS,
        created_at=now,
    )

    decision = policy.evaluate(current_inference=inf, recent_interventions=[])
    assert decision is not None
    assert decision.action == AdaptationAction.SUGGEST_SHORT_BREAK
    assert decision.trigger_state == "WORKLOAD"


def test_adaptation_policy_respects_cooldown():
    policy = AdaptationPolicy(cooldown_seconds=120)
    now = datetime.now(timezone.utc)

    past_decision = AdaptationDecision(
        intervention_id="int_past",
        session_id="s_1",
        timestamp=now - timedelta(seconds=45),  # 45s ago < 120s cooldown
        action=AdaptationAction.SUGGEST_SHORT_BREAK,
        reason="Past break",
        status=InterventionStatus.ACCEPTED,
    )

    inf = InferenceOutput(
        inference_id="inf_2",
        session_id="s_1",
        window_id="w_2",
        workload=StateEstimate(value=0.85, confidence=0.90, level=StateLevel.HIGH),
        fatigue=StateEstimate(value=0.30, confidence=0.80, level=StateLevel.LOW),
        engagement=StateEstimate(value=0.75, confidence=0.85, level=StateLevel.HIGH),
        quality_gate=QualityGate.PASS,
        created_at=now,
    )

    # Should be suppressed due to active cooldown
    decision = policy.evaluate(current_inference=inf, recent_interventions=[past_decision])
    assert decision is None


def test_adaptation_policy_suppressed_on_insufficient_quality():
    """Case C: High estimated workload + INSUFFICIENT is strictly suppressed."""
    policy = AdaptationPolicy()
    now = datetime.now(timezone.utc)

    inf = InferenceOutput(
        inference_id="inf_3",
        session_id="s_1",
        window_id="w_3",
        workload=StateEstimate(value=0.95, confidence=0.30, level=StateLevel.HIGH),
        fatigue=StateEstimate(value=0.30, confidence=0.30, level=StateLevel.LOW),
        engagement=StateEstimate(value=0.50, confidence=0.30, level=StateLevel.MODERATE),
        quality_gate=QualityGate.INSUFFICIENT,  # Data gate is INSUFFICIENT
        created_at=now,
    )

    decision = policy.evaluate(current_inference=inf, recent_interventions=[])
    assert decision is None


def test_adaptation_policy_degraded_allows_conservative_adaptation_when_confidence_met():
    """Case B1: High estimated workload + DEGRADED triggers conservative adaptation if conf >= 0.65."""
    policy = AdaptationPolicy(min_confidence_for_action=0.65)
    now = datetime.now(timezone.utc)

    inf = InferenceOutput(
        inference_id="inf_degraded_valid",
        session_id="s_1",
        window_id="w_degraded_1",
        workload=StateEstimate(value=0.80, confidence=0.68, level=StateLevel.HIGH),
        fatigue=StateEstimate(value=0.30, confidence=0.68, level=StateLevel.LOW),
        engagement=StateEstimate(value=0.70, confidence=0.68, level=StateLevel.HIGH),
        quality_gate=QualityGate.DEGRADED,
        created_at=now,
    )

    decision = policy.evaluate(current_inference=inf, recent_interventions=[])
    assert decision is not None
    assert decision.action == AdaptationAction.SUGGEST_SHORT_BREAK
    assert "Conservative adaptation based on limited available evidence" in decision.reason
    assert decision.metadata["is_conservative"] is True
    assert decision.metadata["quality_gate"] == "DEGRADED"


def test_adaptation_policy_degraded_suppressed_when_confidence_below_action_threshold():
    """Case B2: High estimated workload + DEGRADED suppressed if conf < 0.65."""
    policy = AdaptationPolicy(min_confidence_for_action=0.65)
    now = datetime.now(timezone.utc)

    inf = InferenceOutput(
        inference_id="inf_degraded_low_conf",
        session_id="s_1",
        window_id="w_degraded_2",
        workload=StateEstimate(value=0.88, confidence=0.55, level=StateLevel.HIGH),
        fatigue=StateEstimate(value=0.30, confidence=0.55, level=StateLevel.LOW),
        engagement=StateEstimate(value=0.70, confidence=0.55, level=StateLevel.HIGH),
        quality_gate=QualityGate.DEGRADED,
        created_at=now,
    )

    decision = policy.evaluate(current_inference=inf, recent_interventions=[])
    assert decision is None


def test_adaptation_policy_no_unnecessary_intervention_when_workload_low():
    """Case D: Low workload + PASS triggers no unnecessary intervention."""
    policy = AdaptationPolicy()
    now = datetime.now(timezone.utc)

    inf = InferenceOutput(
        inference_id="inf_low_wl",
        session_id="s_1",
        window_id="w_low",
        workload=StateEstimate(value=0.25, confidence=0.90, level=StateLevel.LOW),
        fatigue=StateEstimate(value=0.20, confidence=0.90, level=StateLevel.LOW),
        engagement=StateEstimate(value=0.85, confidence=0.90, level=StateLevel.HIGH),
        quality_gate=QualityGate.PASS,
        created_at=now,
    )

    decision = policy.evaluate(current_inference=inf, recent_interventions=[])
    assert decision is None
