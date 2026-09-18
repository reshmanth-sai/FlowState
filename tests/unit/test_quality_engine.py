"""Unit tests for Data Quality Engine and Quality Gating."""

from datetime import datetime, timedelta, timezone
from backend.domain.models import CanonicalEvent, QualityGate, SignalType, SourceType
from backend.quality.engine import DataQualityEngine


def test_quality_engine_valid_stream():
    engine = DataQualityEngine()
    now = datetime.now(timezone.utc)

    # 30 valid heart rate events at 1 Hz
    events = [
        CanonicalEvent(
            id=f"e_{i}",
            session_id="s1",
            timestamp=now + timedelta(seconds=i),
            source_type=SourceType.SIMULATED,
            signal_type=SignalType.HEART_RATE,
            value=72.0 + (i % 3),
            unit="bpm",
            quality=1.0,
        )
        for i in range(30)
    ]
    # Add motion events
    events.append(
        CanonicalEvent(
            id="e_mot",
            session_id="s1",
            timestamp=now + timedelta(seconds=15),
            source_type=SourceType.SIMULATED,
            signal_type=SignalType.MOTION,
            value=0.05,
            unit="g",
            quality=1.0,
        )
    )
    # Add task event
    events.append(
        CanonicalEvent(
            id="e_task",
            session_id="s1",
            timestamp=now + timedelta(seconds=20),
            source_type=SourceType.SIMULATED,
            signal_type=SignalType.TASK_EVENT,
            value={"action": "ANSWER_SUBMITTED", "response_time_ms": 450},
            unit="task",
            quality=1.0,
        )
    )

    report = engine.evaluate_window_quality(events, window_duration_seconds=30.0)
    assert report.quality_gate == QualityGate.PASS
    assert report.quality_summary["heart_rate"] >= 0.8
    assert report.quality_summary["motion"] == 1.0
    assert report.quality_summary["task_behaviour"] == 1.0


def test_quality_engine_large_gaps():
    engine = DataQualityEngine(max_timestamp_gap_seconds=5.0)
    now = datetime.now(timezone.utc)

    # Only 2 samples with a 20-second gap
    events = [
        CanonicalEvent(
            id="e_1",
            session_id="s1",
            timestamp=now,
            source_type=SourceType.SIMULATED,
            signal_type=SignalType.HEART_RATE,
            value=72.0,
            unit="bpm",
            quality=1.0,
        ),
        CanonicalEvent(
            id="e_2",
            session_id="s1",
            timestamp=now + timedelta(seconds=20),
            source_type=SourceType.SIMULATED,
            signal_type=SignalType.HEART_RATE,
            value=74.0,
            unit="bpm",
            quality=1.0,
        ),
    ]

    report = engine.evaluate_window_quality(events, window_duration_seconds=30.0)
    assert report.quality_gate in [QualityGate.DEGRADED, QualityGate.INSUFFICIENT]
    assert any("gap" in issue.lower() for issue in report.issues)


def test_quality_engine_empty_window():
    engine = DataQualityEngine()
    report = engine.evaluate_window_quality([], window_duration_seconds=30.0)
    assert report.quality_gate == QualityGate.INSUFFICIENT
    assert report.completeness == 0.0
