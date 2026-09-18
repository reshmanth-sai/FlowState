"""Intervention Feedback and Outcome Tracker for Flowstate.

Complies with Section 6 (M15) & Section 14 of Master Specification:
- Captures explicit user responses: ACCEPTED, DISMISSED, POSTPONED.
- Connects the intervention to a post-intervention observation window to measure subsequent behavioral and physiological change.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.domain.models import (
    AdaptationDecision,
    InterventionFeedback,
    InterventionStatus,
)
from backend.domain.repositories import AdaptationRepository
from backend.storage.sqlite_repo import SQLiteAdaptationRepository


class FeedbackEngine:
    def __init__(self, adaptation_repo: Optional[AdaptationRepository] = None):
        self.adaptation_repo = adaptation_repo or SQLiteAdaptationRepository()

    async def record_response(
        self,
        intervention_id: str,
        user_action: InterventionStatus,
        user_notes: Optional[str] = None,
        post_state_change: Optional[Dict[str, Any]] = None,
    ) -> Optional[InterventionFeedback]:
        """Record user feedback and update intervention status."""
        decision = await self.adaptation_repo.get_decision_by_id(intervention_id)
        if not decision:
            return None

        # Update decision status
        decision.status = user_action
        await self.adaptation_repo.update_decision(decision)

        # Create feedback audit record
        feedback = InterventionFeedback(
            id=f"fb_{uuid.uuid4().hex[:10]}",
            intervention_id=intervention_id,
            session_id=decision.session_id,
            timestamp=datetime.now(timezone.utc),
            user_action=user_action,
            user_notes=user_notes,
            post_state_change=post_state_change,
        )
        return await self.adaptation_repo.save_feedback(feedback)

    async def link_outcome_window(self, intervention_id: str, outcome_window_id: str) -> None:
        """Associate the post-intervention window with the intervention record."""
        decision = await self.adaptation_repo.get_decision_by_id(intervention_id)
        if decision:
            decision.outcome_window_id = outcome_window_id
            await self.adaptation_repo.update_decision(decision)

    async def get_session_feedback(self, session_id: str) -> List[InterventionFeedback]:
        return await self.adaptation_repo.get_feedback_for_session(session_id)
