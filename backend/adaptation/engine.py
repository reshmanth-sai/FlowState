"""Adaptation Engine for Flowstate.

Complies with Section 6 (M14) & Section 14 of Master Specification:
- Bridges state inference to explainable, bounded interface actions.
- Integrates AdaptationPolicy with session history and persistence.
- Persists all decisions with provenance.
"""

from __future__ import annotations

from typing import List, Optional

from backend.adaptation.policy import AdaptationPolicy
from backend.domain.models import AdaptationDecision, InferenceOutput
from backend.domain.repositories import AdaptationRepository
from backend.storage.sqlite_repo import SQLiteAdaptationRepository


class AdaptationEngine:
    def __init__(
        self,
        policy: Optional[AdaptationPolicy] = None,
        adaptation_repo: Optional[AdaptationRepository] = None,
    ):
        self.policy = policy or AdaptationPolicy()
        self.adaptation_repo = adaptation_repo or SQLiteAdaptationRepository()

    async def evaluate_and_record(
        self, current_inference: InferenceOutput
    ) -> Optional[AdaptationDecision]:
        """Evaluate policy against inference output and persist decision if triggered."""
        recent_interventions = await self.adaptation_repo.get_for_session(current_inference.session_id)
        decision = self.policy.evaluate(current_inference, recent_interventions)
        if decision:
            await self.adaptation_repo.save_decision(decision)
        return decision

    async def get_session_interventions(self, session_id: str) -> List[AdaptationDecision]:
        return await self.adaptation_repo.get_for_session(session_id)
