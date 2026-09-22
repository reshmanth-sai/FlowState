"""Abstract repository interfaces for Flowstate.

Defines persistence contracts decoupled from the underlying storage engine (SQLite, PostgreSQL, Neon).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime

from backend.domain.models import (
    Session,
    CanonicalEvent,
    SignalWindow,
    FeatureVector,
    InferenceOutput,
    AdaptationDecision,
    InterventionFeedback,
    BaselineProfile,
    ExperimentRecord,
    EvaluationRunRecord,
)


class SessionRepository(ABC):
    @abstractmethod
    async def create(self, session: Session) -> Session:
        pass

    @abstractmethod
    async def get_by_id(self, session_id: str) -> Optional[Session]:
        pass

    @abstractmethod
    async def update(self, session: Session) -> Session:
        pass

    @abstractmethod
    async def list_recent(self, limit: int = 50) -> List[Session]:
        pass

    @abstractmethod
    async def stop_all_running(self, except_session_id: Optional[str] = None) -> int:
        pass


class EventRepository(ABC):
    @abstractmethod
    async def add_event(self, event: CanonicalEvent) -> CanonicalEvent:
        pass

    @abstractmethod
    async def add_events_batch(self, events: List[CanonicalEvent]) -> int:
        pass

    @abstractmethod
    async def get_events_for_session(
        self,
        session_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        signal_type: Optional[str] = None,
    ) -> List[CanonicalEvent]:
        pass


class WindowRepository(ABC):
    @abstractmethod
    async def save_window(self, window: SignalWindow) -> SignalWindow:
        pass

    @abstractmethod
    async def get_windows_for_session(self, session_id: str) -> List[SignalWindow]:
        pass

    @abstractmethod
    async def get_window_by_id(self, window_id: str) -> Optional[SignalWindow]:
        pass


class FeatureRepository(ABC):
    @abstractmethod
    async def save_features(self, features: FeatureVector) -> FeatureVector:
        pass

    @abstractmethod
    async def get_by_window(self, window_id: str) -> Optional[FeatureVector]:
        pass

    @abstractmethod
    async def get_for_session(self, session_id: str) -> List[FeatureVector]:
        pass


class InferenceRepository(ABC):
    @abstractmethod
    async def save_inference(self, inference: InferenceOutput) -> InferenceOutput:
        pass

    @abstractmethod
    async def get_by_window(self, window_id: str) -> Optional[InferenceOutput]:
        pass

    @abstractmethod
    async def get_timeline_for_session(self, session_id: str) -> List[InferenceOutput]:
        pass


class AdaptationRepository(ABC):
    @abstractmethod
    async def save_decision(self, decision: AdaptationDecision) -> AdaptationDecision:
        pass

    @abstractmethod
    async def get_decision_by_id(self, intervention_id: str) -> Optional[AdaptationDecision]:
        pass

    @abstractmethod
    async def update_decision(self, decision: AdaptationDecision) -> AdaptationDecision:
        pass

    @abstractmethod
    async def get_for_session(self, session_id: str) -> List[AdaptationDecision]:
        pass

    @abstractmethod
    async def save_feedback(self, feedback: InterventionFeedback) -> InterventionFeedback:
        pass

    @abstractmethod
    async def get_feedback_for_session(self, session_id: str) -> List[InterventionFeedback]:
        pass


class BaselineRepository(ABC):
    @abstractmethod
    async def save_baseline(self, baseline: BaselineProfile) -> BaselineProfile:
        pass

    @abstractmethod
    async def get_baseline(self, baseline_id: str) -> Optional[BaselineProfile]:
        pass

    @abstractmethod
    async def get_for_participant(self, participant_key: str) -> Optional[BaselineProfile]:
        pass


class ExperimentRepository(ABC):
    @abstractmethod
    async def save_experiment(self, experiment: ExperimentRecord) -> ExperimentRecord:
        pass

    @abstractmethod
    async def list_experiments(self) -> List[ExperimentRecord]:
        pass

    @abstractmethod
    async def get_by_id(self, experiment_id: str) -> Optional[ExperimentRecord]:
        pass


class EvaluationRepository(ABC):
    @abstractmethod
    async def save_evaluation_run(self, run: EvaluationRunRecord) -> EvaluationRunRecord:
        pass

    @abstractmethod
    async def get_by_id(self, run_id: str) -> Optional[EvaluationRunRecord]:
        pass

    @abstractmethod
    async def list_runs(self, limit: int = 50) -> List[EvaluationRunRecord]:
        pass

    @abstractmethod
    async def get_latest_for_scenario(self, scenario_id: str) -> Optional[EvaluationRunRecord]:
        pass

