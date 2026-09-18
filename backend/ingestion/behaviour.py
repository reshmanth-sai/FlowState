"""Behavioral Telemetry Collector for Flowstate tasks.

Complies with Section 4 & Section 6 (M04) of Master Specification:
- Captures strictly task-relevant behavioral signals:
    * response time (ms)
    * error rate / correctness
    * retries
    * pause durations
    * interaction rhythm
    * task difficulty adjustments
- Emits standard CanonicalEvent items with SignalType.TASK_EVENT.
- Does NOT capture unrelated surveillance or private keystrokes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from backend.domain.models import CanonicalEvent, SignalType, SourceType


class BehaviourCollector:
    def __init__(self, default_source_type: SourceType = SourceType.COMPUTER_BEHAVIOR):
        self.default_source_type = default_source_type

    def create_task_event(
        self,
        session_id: str,
        action: str,
        payload: Dict[str, Any],
        timestamp: Optional[datetime] = None,
        source_type: Optional[SourceType] = None,
    ) -> CanonicalEvent:
        ts = timestamp or datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        data = dict(payload)
        data["action"] = action

        return CanonicalEvent(
            id=f"evt_beh_{uuid.uuid4().hex[:10]}",
            session_id=session_id,
            timestamp=ts,
            source_type=source_type or self.default_source_type,
            source_device="Flowstate Computer Interaction Telemetry",
            signal_type=SignalType.TASK_EVENT,
            value=data,
            unit="task_telemetry",
            quality=1.0,
            metadata=data,
        )

    def record_answer_submitted(
        self,
        session_id: str,
        question_id: str,
        is_correct: bool,
        response_time_ms: float,
        difficulty: float = 1.0,
        retry_count: int = 0,
        source_type: Optional[SourceType] = None,
    ) -> CanonicalEvent:
        return self.create_task_event(
            session_id=session_id,
            action="ANSWER_SUBMITTED",
            payload={
                "question_id": question_id,
                "correct": is_correct,
                "response_time_ms": round(response_time_ms, 1),
                "difficulty": round(difficulty, 1),
                "retry_count": retry_count,
            },
            source_type=source_type,
        )

    def record_pause(
        self,
        session_id: str,
        pause_duration_seconds: float,
        source_type: Optional[SourceType] = None,
    ) -> CanonicalEvent:
        return self.create_task_event(
            session_id=session_id,
            action="PAUSE_DETECTED",
            payload={"pause_duration_seconds": round(pause_duration_seconds, 2)},
            source_type=source_type,
        )

    def record_difficulty_changed(
        self,
        session_id: str,
        old_difficulty: float,
        new_difficulty: float,
        reason: str,
        source_type: Optional[SourceType] = None,
    ) -> CanonicalEvent:
        return self.create_task_event(
            session_id=session_id,
            action="DIFFICULTY_ADJUSTED",
            payload={
                "old_difficulty": old_difficulty,
                "new_difficulty": new_difficulty,
                "reason": reason,
            },
            source_type=source_type,
        )
