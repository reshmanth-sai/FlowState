"""Unit tests for Feature Extraction and Personalization Deltas."""

from datetime import datetime, timedelta, timezone
from backend.domain.models import BaselineProfile, CanonicalEvent, SignalType, SignalWindow, SourceType
from backend.features.engine import FeatureEngine
from backend.personalization.engine import PersonalizationEngine


def test_feature_extraction_and_baseline_delta():
    p_engine = PersonalizationEngine()
    # Seed baseline
    p_engine.set_baseline(
        BaselineProfile(
            baseline_id="base_1",
            participant_key="user_123",
            created_at=datetime.now(timezone.utc),
            window_count=2,
            hr_mean=70.0,
            hr_std=3.0,
            response_time_mean=400.0,
            response_time_std=50.0,
            status="CALIBRATED",
        )
    )

    feat_engine = FeatureEngine(personalization_engine=p_engine)

    now = datetime.now(timezone.utc)
    win = SignalWindow(
        window_id="w_1",
        session_id="s_1",
        start_time=now,
        end_time=now + timedelta(seconds=30),
        duration_seconds=30.0,
        completeness=1.0,
        quality_summary={"heart_rate": 1.0, "task_behaviour": 1.0},
        event_counts={"heart_rate": 20, "task_event": 5},
    )

    # 10 HR events averaging 80 bpm
    events = [
        CanonicalEvent(
            id=f"e_{i}",
            session_id="s_1",
            timestamp=now + timedelta(seconds=i),
            source_type=SourceType.SIMULATED,
            signal_type=SignalType.HEART_RATE,
            value=80.0,
            unit="bpm",
            quality=1.0,
        )
        for i in range(10)
    ]

    # Task events averaging 600 ms
    for i in range(3):
        events.append(
            CanonicalEvent(
                id=f"t_{i}",
                session_id="s_1",
                timestamp=now + timedelta(seconds=10 + i * 5),
                source_type=SourceType.SIMULATED,
                signal_type=SignalType.TASK_EVENT,
                value={
                    "action": "ANSWER_SUBMITTED",
                    "correct": True,
                    "response_time_ms": 600.0,
                    "difficulty": 2.0,
                },
                unit="task",
                quality=1.0,
            )
        )

    fv = feat_engine.compute_features(
        window=win,
        events=events,
        participant_key="user_123",
        session_start_time=now,
    )

    assert fv.availability_mask["heart_rate"] is True
    assert fv.availability_mask["task_behaviour"] is True
    assert fv.availability_mask["eda"] is False  # Must never falsely claim EDA

    assert fv.features["hr_mean"] == 80.0
    assert fv.features["task_response_time_mean"] == 600.0
    assert fv.features["task_completion_count"] == 3.0
    assert fv.features["task_error_rate"] == 0.0

    # Personalization deltas
    assert fv.features["hr_baseline_delta"] == 10.0  # 80.0 - 70.0
    assert fv.features["response_time_baseline_delta"] == 200.0  # 600.0 - 400.0
