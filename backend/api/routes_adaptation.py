"""Adaptation and Feedback API routes for Flowstate.

Complies with Section 17 of Master Specification.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.domain.models import AdaptationDecision, InterventionFeedback, InterventionStatus
from backend.sessions.orchestrator import SessionOrchestrator

router = APIRouter(prefix="/interventions", tags=["interventions"])
orchestrator = SessionOrchestrator()


class FeedbackRequest(BaseModel):
    user_action: InterventionStatus
    user_notes: Optional[str] = None
    post_state_change: Optional[Dict[str, Any]] = None


@router.get("/{session_id}", response_model=List[AdaptationDecision])
async def get_session_interventions(session_id: str):
    return await orchestrator.adaptation_engine.get_session_interventions(session_id)


@router.post("/{intervention_id}/feedback", response_model=InterventionFeedback)
async def record_intervention_feedback(intervention_id: str, req: FeedbackRequest):
    """Record user accept/dismiss/postpone response and post-intervention outcome."""
    fb = await orchestrator.feedback_engine.record_response(
        intervention_id=intervention_id,
        user_action=req.user_action,
        user_notes=req.user_notes,
        post_state_change=req.post_state_change,
    )
    if not fb:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return fb
