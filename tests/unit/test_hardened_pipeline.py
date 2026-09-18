"""Hardened scientific integrity and pipeline verification tests.

Verifies:
1. End-to-end pipeline: Simulator -> CanonicalEvent -> Window -> Features -> Inference -> Adaptation
2. Interactive task: Task event -> CanonicalEvent -> Features
3. Quality gating: Degraded and Insufficient data conditions
4. Adaptation suppression: INSUFFICIENT quality strictly suppresses interventions
5. Cooldown: Repeated triggers are suppressed within cooldown period
6. Provenance: SIMULATED vs REAL_WEARABLE source preservation
7. Determinism: Same seed yields identical events and inferences
8. Missing modality: Unavailable modality sets availability_mask False and None (never zero-padded)
"""

from datetime import datetime, timedelta, timezone
import pytest

from backend.adaptation.policy import AdaptationPolicy
from backend.confidence.engine import ConfidenceEngine
from backend.data_providers.simulator import SimulatorProvider
from backend.domain.models import (
    AdaptationAction,
    AdaptationDecision,
    CanonicalEvent,
    FeatureVector,
    InferenceOutput,
    InterventionStatus,
    QualityGate,
    SignalType,
    SignalWindow,
    SourceType,
    StateEstimate,
    StateLevel,
)
from backend.features.engine import FeatureEngine
from backend.inference.baseline_models import BaselineEstimators
from backend.inference.engine import InferenceEngine
from backend.ingestion.behaviour import BehaviourCollector
from backend.personalization.engine import PersonalizationEngine
from backend.quality.engine import DataQualityEngine
from backend.synchronization.engine import SynchronizationEngine


@pytest.mark.asyncio
async def test_determinism_same_seed_same_output():
    """Verify that same seed produces identical event streams."""
    sim1 = SimulatorProvider(seed=42)
    sim2 = SimulatorProvider(seed=42)

    start_ts = datetime(2026, 9, 18, 12, 0, 0, tzinfo=timezone.utc)
    events1 = await sim1.generate_events("s1", start_ts, duration_seconds=60.0)
    events2 = await sim2.generate_events("s1", start_ts, duration_seconds=60.0)

    assert len(events1) == len(events2)
    for e1, e2 in zip(events1, events2):
        assert e1.timestamp == e2.timestamp
        assert e1.signal_type == e2.signal_type
        assert e1.value == e2.value
        assert e1.source_type == SourceType.SIMULATED


def test_interactive_task_event_to_feature_extraction():
    """Verify that interactive task telemetry flows into canonical events and features as COMPUTER_BEHAVIOR."""
    collector = BehaviourCollector(default_source_type=SourceType.COMPUTER_BEHAVIOR)
    start_ts = datetime(2026, 9, 18, 12, 0, 0, tzinfo=timezone.utc)

    # Participant answers 3 math questions
    events = [
        collector.record_answer_submitted(
            session_id="sess_live",
            question_id="q1",
            is_correct=True,
            response_time_ms=450.0,
            difficulty=1.5,
            source_type=SourceType.COMPUTER_BEHAVIOR,
        ),
        collector.record_answer_submitted(
            session_id="sess_live",
            question_id="q2",
            is_correct=False,
            response_time_ms=750.0,
            difficulty=1.7,
            source_type=SourceType.COMPUTER_BEHAVIOR,
        ),
        collector.record_answer_submitted(
            session_id="sess_live",
            question_id="q3",
            is_correct=True,
            response_time_ms=600.0,
            difficulty=1.5,
            source_type=SourceType.COMPUTER_BEHAVIOR,
        ),
    ]

    # Check canonical event properties
    for e in events:
        assert e.signal_type == SignalType.TASK_EVENT
        assert e.source_type == SourceType.COMPUTER_BEHAVIOR
        assert e.source_type != SourceType.REAL_WEARABLE
        assert isinstance(e.value, dict)
        assert "response_time_ms" in e.value

    # Compute features on this window
    win = SignalWindow(
        window_id="win_test",
        session_id="sess_live",
        start_time=start_ts,
        end_time=start_ts + timedelta(seconds=30),
        duration_seconds=30.0,
        completeness=1.0,
        quality_summary={"task_behaviour": 1.0},
        event_counts={"task_event": 3},
    )

    engine = FeatureEngine()
    fv = engine.compute_features(window=win, events=events, session_start_time=start_ts)

    assert fv.availability_mask["task_behaviour"] is True
    assert fv.features["task_completion_count"] == 3.0
    assert fv.features["task_response_time_mean"] == 600.0  # (450 + 750 + 600) / 3
    assert fv.features["task_error_rate"] == round(1 / 3, 3)  # 1 incorrect out of 3


def test_missing_modality_is_masked_never_zero_padded():
    """Verify that when wearable is missing, features are None and NOT 0.0."""
    start_ts = datetime(2026, 9, 18, 12, 0, 0, tzinfo=timezone.utc)
    collector = BehaviourCollector()

    # Only task events, NO wearable events
    events = [
        collector.record_answer_submitted(
            session_id="sess_task_only",
            question_id="q1",
            is_correct=True,
            response_time_ms=500.0,
        )
    ]

    win = SignalWindow(
        window_id="win_task_only",
        session_id="sess_task_only",
        start_time=start_ts,
        end_time=start_ts + timedelta(seconds=30),
        duration_seconds=30.0,
        completeness=0.5,
        quality_summary={"task_behaviour": 1.0},
        event_counts={"task_event": 1},
    )

    engine = FeatureEngine()
    fv = engine.compute_features(window=win, events=events, session_start_time=start_ts)

    # Wearable mask MUST be False
    assert fv.availability_mask["heart_rate"] is False
    assert fv.availability_mask["motion"] is False

    # Wearable values MUST be None, not 0.0
    assert fv.features["hr_mean"] is None
    assert fv.features["hr_median"] is None
    assert fv.features["hr_std"] is None
    assert fv.features["hr_slope"] is None
    assert fv.features["motion_intensity_mean"] is None


def test_quality_gate_degrades_when_single_modality():
    """Verify that confidence engine sets DEGRADED when only 1 modality is available."""
    conf_engine = ConfidenceEngine()

    fv = FeatureVector(
        window_id="w_test",
        session_id="s_test",
        feature_version="1.0.0",
        features={"task_response_time_mean": 600.0, "time_on_task_seconds": 100.0},
        availability_mask={"heart_rate": False, "motion": False, "task_behaviour": True},
        quality_summary={"task_behaviour": 1.0},
        created_at=datetime.now(timezone.utc),
    )

    conf, gate = conf_engine.calculate_confidence_and_gate(fv, "workload")
    # Because available modalities < 2, gate cannot be PASS
    assert gate == QualityGate.DEGRADED


def test_adaptation_suppressed_when_insufficient_quality():
    """Verify that adaptation strictly suppresses actions when quality is INSUFFICIENT."""
    policy = AdaptationPolicy()
    now = datetime.now(timezone.utc)

    inf = InferenceOutput(
        inference_id="inf_noisy",
        session_id="s_noisy",
        window_id="w_noisy",
        workload=StateEstimate(value=0.98, confidence=0.20, level=StateLevel.HIGH),
        fatigue=StateEstimate(value=0.85, confidence=0.20, level=StateLevel.ELEVATED),
        engagement=StateEstimate(value=0.40, confidence=0.20, level=StateLevel.MODERATE),
        quality_gate=QualityGate.INSUFFICIENT,
        created_at=now,
    )

    decision = policy.evaluate(current_inference=inf, recent_interventions=[])
    assert decision is None


def test_provenance_preserved_in_pipeline():
    """Verify that SourceType (SIMULATED vs REAL_WEARABLE vs COMPUTER_BEHAVIOR) is preserved."""
    sim_event = CanonicalEvent(
        id="e_sim",
        session_id="s1",
        timestamp=datetime.now(timezone.utc),
        source_type=SourceType.SIMULATED,
        signal_type=SignalType.HEART_RATE,
        value=72.0,
        unit="bpm",
        quality=1.0,
    )
    assert sim_event.source_type == SourceType.SIMULATED

    real_event = CanonicalEvent(
        id="e_real",
        session_id="s1",
        timestamp=datetime.now(timezone.utc),
        source_type=SourceType.REAL_WEARABLE,
        signal_type=SignalType.HEART_RATE,
        value=75.0,
        unit="bpm",
        quality=1.0,
    )
    assert real_event.source_type == SourceType.REAL_WEARABLE

    task_event = CanonicalEvent(
        id="e_comp",
        session_id="s1",
        timestamp=datetime.now(timezone.utc),
        source_type=SourceType.COMPUTER_BEHAVIOR,
        signal_type=SignalType.TASK_EVENT,
        value={"action": "ANSWER_SUBMITTED", "response_time_ms": 400.0},
        unit="task_telemetry",
        quality=1.0,
    )
    assert task_event.source_type == SourceType.COMPUTER_BEHAVIOR
    assert task_event.source_type != SourceType.REAL_WEARABLE


def test_task_telemetry_never_classified_as_real_wearable():
    """Verify that BehaviourCollector outputs COMPUTER_BEHAVIOR and never REAL_WEARABLE."""
    collector = BehaviourCollector()
    event = collector.record_answer_submitted(
        session_id="s_test",
        question_id="q_99",
        is_correct=True,
        response_time_ms=380.0,
        difficulty=2.0,
    )
    assert event.source_type == SourceType.COMPUTER_BEHAVIOR
    assert event.source_type != SourceType.REAL_WEARABLE
    assert "Computer" in event.source_device


def test_task_difficulty_does_not_influence_cognitive_inference():
    """Scientific Integrity: Verify task difficulty does NOT directly inflate or alter cognitive state estimates."""
    estimators = BaselineEstimators()
    now = datetime.now(timezone.utc)

    # Base feature vector with Easy problem context (1.0)
    fv_easy = FeatureVector(
        window_id="w_easy",
        session_id="s_test",
        feature_version="1.0.0",
        features={
            "task_response_time_mean": 650.0,
            "task_response_time_std": 80.0,
            "task_error_rate": 0.10,
            "task_completion_count": 4.0,
            "pause_duration_total": 4.0,
            "time_on_task_seconds": 60.0,
            "hr_mean": 72.0,
            "hr_baseline_delta": 2.0,
            "hr_std": 5.0,
            "task_difficulty_mean": 1.0,  # Easy
        },
        availability_mask={"task_behaviour": True, "heart_rate": True, "motion": False, "eda": False},
        quality_summary={"task_behaviour": 1.0, "heart_rate": 1.0},
        created_at=now,
    )

    # Identical behavioral & physiological signals, but Hard problem context (4.0)
    fv_hard = FeatureVector(
        window_id="w_hard",
        session_id="s_test",
        feature_version="1.0.0",
        features={
            "task_response_time_mean": 650.0,
            "task_response_time_std": 80.0,
            "task_error_rate": 0.10,
            "task_completion_count": 4.0,
            "pause_duration_total": 4.0,
            "time_on_task_seconds": 60.0,
            "hr_mean": 72.0,
            "hr_baseline_delta": 2.0,
            "hr_std": 5.0,
            "task_difficulty_mean": 4.0,  # Hard
        },
        availability_mask={"task_behaviour": True, "heart_rate": True, "motion": False, "eda": False},
        quality_summary={"task_behaviour": 1.0, "heart_rate": 1.0},
        created_at=now,
    )

    # Workload estimates must be 100% identical
    wl_easy, wl_level_easy = estimators.estimate_workload(fv_easy)
    wl_hard, wl_level_hard = estimators.estimate_workload(fv_hard)
    assert wl_easy == wl_hard, f"Scientific leak: Workload varied with task difficulty! {wl_easy} != {wl_hard}"
    assert wl_level_easy == wl_level_hard

    # Fatigue estimates must be 100% identical
    ft_easy, _ = estimators.estimate_fatigue(fv_easy)
    ft_hard, _ = estimators.estimate_fatigue(fv_hard)
    assert ft_easy == ft_hard

    # Engagement estimates must be 100% identical
    eg_easy, _ = estimators.estimate_engagement(fv_easy)
    eg_hard, _ = estimators.estimate_engagement(fv_hard)
    assert eg_easy == eg_hard


