"""Interactive Cognitive Task definition and telemetry ingestion routes.

Implements the user-approved refinement:
- Task Definition Layer
- Active Built-in Task: Adaptive Mental Arithmetic
- Clean behavioral telemetry ingestion: difficulty, response time, correctness, errors, pauses.
"""

from __future__ import annotations

import random
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.domain.models import SourceType, TaskDefinition
from backend.ingestion.behaviour import BehaviourCollector
from backend.sessions.orchestrator import SessionOrchestrator

router = APIRouter(prefix="/tasks", tags=["tasks"])
orchestrator = SessionOrchestrator()
collector = BehaviourCollector(default_source_type=SourceType.COMPUTER_BEHAVIOR)


class TaskSubmissionRequest(BaseModel):
    question_id: str
    user_answer: int
    correct_answer: int
    response_time_ms: float
    difficulty: float
    retry_count: int = 0
    is_live_user: bool = True


@router.get("/active", response_model=TaskDefinition)
async def get_active_task_definition():
    """Return the active interactive cognitive task definition."""
    return TaskDefinition(
        task_id="adaptive_arithmetic",
        name="Adaptive Mental Arithmetic",
        type="COGNITIVE_CHALLENGE",
        difficulty="ADAPTIVE",
        duration_seconds=300,
        configuration={
            "description": "Solve arithmetic problems under time pressure. Problem complexity scales adaptively with response speed and accuracy.",
            "operations": ["+", "-", "*"],
            "base_difficulty": 1.0,
            "max_difficulty": 4.0,
        },
        telemetry_schema={
            "metrics": ["response_time_ms", "correctness", "error_rate", "difficulty", "retry_count"]
        },
    )


@router.get("/problem")
async def generate_problem(difficulty: float = 1.0):
    """Generate an arithmetic question scaled by current task difficulty."""
    diff = max(1.0, min(4.0, difficulty))
    rng = random.Random()

    if diff < 1.8:
        # Easy: Single-digit addition/subtraction
        a = rng.randint(4, 18)
        b = rng.randint(3, 14)
        op = rng.choice(["+", "-"])
        ans = a + b if op == "+" else a - b
    elif diff < 2.8:
        # Medium: Double digit + single/double digit
        a = rng.randint(15, 65)
        b = rng.randint(12, 45)
        op = rng.choice(["+", "-"])
        ans = a + b if op == "+" else a - b
    else:
        # High: Multiplication / chained arithmetic
        a = rng.randint(7, 19)
        b = rng.randint(6, 14)
        op = "*"
        ans = a * b

    return {
        "question_id": f"q_{rng.randint(1000, 9999)}",
        "prompt": f"{a} {op} {b}",
        "expected_answer": ans,
        "difficulty": round(diff, 1),
    }


@router.post("/{session_id}/telemetry")
async def submit_telemetry(session_id: str, req: TaskSubmissionRequest):
    """Receive real live user behavioral telemetry and ingest into session pipeline."""
    session = await orchestrator.session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    is_correct = (req.user_answer == req.correct_answer)
    source_type = SourceType.COMPUTER_BEHAVIOR if req.is_live_user else SourceType.SIMULATED

    event = collector.record_answer_submitted(
        session_id=session_id,
        question_id=req.question_id,
        is_correct=is_correct,
        response_time_ms=req.response_time_ms,
        difficulty=req.difficulty,
        retry_count=req.retry_count,
        source_type=source_type,
    )
    saved_event = await orchestrator.ingestion_service.ingest_event(event)

    # Trigger sliding window evaluation if enough events exist
    live_result = await orchestrator.process_live_window(session_id)

    return {
        "status": "INGESTED",
        "correct": is_correct,
        "event_id": saved_event.id if saved_event else None,
        "live_update": live_result is not None,
        "latest_state": live_result.get("inference") if live_result else None,
    }


class BrowserTelemetryRequest(BaseModel):
    platform: str = "generic"
    page_title: str = "Browser Task"
    difficulty: float = 1.0
    typing_interval_mean_ms: Optional[float] = None
    typing_interval_std_ms: Optional[float] = None
    backspace_count: int = 0
    delete_count: int = 0
    pause_count: int = 0
    pause_duration_seconds: float = 0.0
    active_time_seconds: float = 15.0
    code_run_count: int = 0
    error_rate: Optional[float] = None
    behavior: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}


@router.post("/{session_id}/browser-telemetry")
async def submit_browser_telemetry(session_id: str, req: BrowserTelemetryRequest):
    """Receive privacy-preserving aggregated computer behavior telemetry from browser extension."""
    import uuid
    from datetime import datetime, timezone
    from backend.domain.models import CanonicalEvent, SignalType

    session = await orchestrator.session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    payload = {
        "action": "BROWSER_INTERACTION_BATCH",
        "platform": req.platform,
        "page_title": req.page_title,
        "difficulty": req.difficulty,
        "typing_interval_mean_ms": req.typing_interval_mean_ms,
        "typing_interval_std_ms": req.typing_interval_std_ms,
        "backspace_count": req.backspace_count,
        "delete_count": req.delete_count,
        "pause_count": req.pause_count,
        "pause_duration_seconds": req.pause_duration_seconds,
        "active_time_seconds": req.active_time_seconds,
        "code_run_count": req.code_run_count,
        "error_rate": req.error_rate,
        "behavior": req.behavior,
        "context": req.context,
        **req.metadata,
    }

    event = CanonicalEvent(
        id=f"evt_ext_{uuid.uuid4().hex[:10]}",
        session_id=session_id,
        timestamp=datetime.now(timezone.utc),
        source_type=SourceType.COMPUTER_BEHAVIOR,
        source_device="Flowstate Chrome Extension",
        signal_type=SignalType.TASK_EVENT,
        value=payload,
        unit="browser_telemetry_batch",
        quality=1.0,
        metadata=payload,
    )

    saved_event = await orchestrator.ingestion_service.ingest_event(event)
    live_result = await orchestrator.process_live_window(session_id)

    # Check for active adaptation intervention
    recent_interventions = await orchestrator.adaptation_engine.get_session_interventions(session_id)
    active_intervention = None
    if recent_interventions:
        last = recent_interventions[-1]
        if last.status.value == "OFFERED":
            active_intervention = last

    return {
        "status": "INGESTED",
        "event_id": saved_event.id if saved_event else None,
        "live_update": live_result is not None,
        "latest_inference": live_result.get("inference") if live_result else None,
        "active_intervention": active_intervention,
    }
