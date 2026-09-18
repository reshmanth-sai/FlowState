"""Windowing and Feature processing API routes for Flowstate.

Complies with Section 17 of Master Specification.
"""

from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.domain.models import FeatureVector, SignalWindow
from backend.sessions.orchestrator import SessionOrchestrator

router = APIRouter(prefix="/processing", tags=["processing"])
orchestrator = SessionOrchestrator()


class ProcessWindowRequest(BaseModel):
    session_id: str


@router.post("/windows")
async def process_session_window(req: ProcessWindowRequest):
    """Process latest sliding window, feature extraction, and inference."""
    result = await orchestrator.process_live_window(req.session_id)
    if not result:
        raise HTTPException(status_code=400, detail="Cannot process window: Session not running or insufficient events.")
    return result


@router.get("/windows/{session_id}", response_model=List[SignalWindow])
async def get_session_windows(session_id: str):
    return await orchestrator.window_repo.get_windows_for_session(session_id)


@router.get("/features/{session_id}", response_model=List[FeatureVector])
async def get_session_features(session_id: str):
    return await orchestrator.feature_repo.get_for_session(session_id)
