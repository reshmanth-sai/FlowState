"""Cognitive state inference and Follow-the-Signal evidence API routes.

Complies with Section 17 & Section 16.1 of Master Specification.
"""

from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.domain.models import InferenceOutput
from backend.sessions.orchestrator import SessionOrchestrator

router = APIRouter(prefix="/inference", tags=["inference"])
orchestrator = SessionOrchestrator()


class WindowInferenceRequest(BaseModel):
    window_id: str


@router.post("/window", response_model=InferenceOutput)
async def infer_for_window(req: WindowInferenceRequest):
    """Run inference for an existing window."""
    fv = await orchestrator.feature_repo.get_by_window(req.window_id)
    if not fv:
        raise HTTPException(status_code=404, detail="Feature vector not found for window")

    inf = orchestrator.inference_engine.run_inference(fv)
    saved_inf = await orchestrator.inference_repo.save_inference(inf)
    return saved_inf


@router.get("/session/{session_id}", response_model=List[InferenceOutput])
async def get_session_inference_timeline(session_id: str):
    """Retrieve full cognitive-state estimate timeline for a session."""
    return await orchestrator.inference_repo.get_timeline_for_session(session_id)


@router.get("/trace/{inference_id}")
async def trace_signal_evidence(inference_id: str):
    """Follow-the-Signal: Full backward trace from state estimate to raw window and features."""
    # Find inference
    conn = orchestrator.inference_repo.db.get_connection()
    try:
        row = conn.execute("SELECT * FROM inferences WHERE inference_id = ?", (inference_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Inference record not found")

        window_id = row["window_id"]
        session_id = row["session_id"]
    finally:
        conn.close()

    window = await orchestrator.window_repo.get_window_by_id(window_id)
    features = await orchestrator.feature_repo.get_by_window(window_id)
    inference = await orchestrator.inference_repo.get_by_window(window_id)

    # Associated intervention if any
    all_ints = await orchestrator.adaptation_engine.get_session_interventions(session_id)
    related_int = next((i for i in all_ints if i.outcome_window_id == window_id or (inference and abs((i.timestamp - inference.created_at).total_seconds()) < 15.0)), None)

    return {
        "inference": inference.model_dump() if inference else None,
        "features": features.model_dump() if features else None,
        "window": window.model_dump() if window else None,
        "intervention": related_int.model_dump() if related_int else None,
        "trace_path": "State Estimate -> Confidence Gate -> Contributing Evidence -> Feature Vector -> Signal Window -> Raw Observations",
    }
