"""Session management API routes for Flowstate.

Complies with Section 17 of Master Specification.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.domain.models import Session, SessionMode
from backend.sessions.orchestrator import SessionOrchestrator

router = APIRouter(prefix="/sessions", tags=["sessions"])
orchestrator = SessionOrchestrator()


class CreateSessionRequest(BaseModel):
    participant_key: str = "reviewer_participant"
    task_id: str = "adaptive_arithmetic"
    mode: SessionMode = SessionMode.SIMULATED
    metadata: Dict[str, Any] = {}


class RunDemoRequest(BaseModel):
    seed: int = 42
    duration_seconds: float = 270.0


@router.post("", response_model=Session)
async def create_session(req: CreateSessionRequest):
    return await orchestrator.create_session(
        participant_key=req.participant_key,
        task_id=req.task_id,
        mode=req.mode,
        metadata=req.metadata,
    )


@router.get("", response_model=List[Session])
async def list_sessions(limit: int = 50):
    return await orchestrator.session_repo.list_recent(limit=limit)


@router.get("/{id}", response_model=Session)
async def get_session(id: str):
    session = await orchestrator.session_repo.get_by_id(id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{id}/start", response_model=Session)
async def start_session(id: str):
    session = await orchestrator.start_session(id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{id}/pause", response_model=Session)
async def pause_session(id: str):
    session = await orchestrator.pause_session(id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{id}/resume", response_model=Session)
async def resume_session(id: str):
    session = await orchestrator.resume_session(id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{id}/stop", response_model=Session)
async def stop_session(id: str):
    session = await orchestrator.stop_session(id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/{id}/timeline")
async def get_session_timeline(id: str):
    try:
        return await orchestrator.get_session_summary(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{id}/demo/run")
async def run_deterministic_demo(id: str, req: RunDemoRequest = RunDemoRequest()):
    try:
        # Auto-start if created
        session = await orchestrator.session_repo.get_by_id(id)
        if session and session.status.value == "CREATED":
            await orchestrator.start_session(id)

        result = await orchestrator.run_deterministic_scenario(
            session_id=id,
            seed=req.seed,
            duration_seconds=req.duration_seconds,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
