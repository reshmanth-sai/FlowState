"""Session Orchestrator for Flowstate.

Complies with Section 6 (M01 & M20) & Section 5 (Target Architecture) of Master Specification:
- Manages complete session lifecycle: CREATE -> START -> PAUSE -> RESUME -> STOP.
- Connects the entire end-to-end research loop:
    Provider -> Ingestion -> Quality -> Synchronization -> Windowing ->
    Features -> Baseline Personalization -> Fusion -> Inference ->
    Confidence Gate -> Explanation -> Adaptation -> Feedback -> Review
- Supports both Path A (Deterministic Demo) and Path B (Live User Session).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from backend.adaptation.engine import AdaptationEngine
from backend.adaptation.feedback import FeedbackEngine
from backend.data_providers.base import DataProvider
from backend.data_providers.importer import ImportProvider
from backend.data_providers.simulator import SimulatorProvider
from backend.data_providers.wearable_adapter import WearableAdapter
from backend.domain.models import (
    AdaptationDecision,
    CanonicalEvent,
    FeatureVector,
    InferenceOutput,
    Session,
    SessionMode,
    SessionStatus,
    SignalWindow,
)
from backend.domain.repositories import (
    EventRepository,
    FeatureRepository,
    InferenceRepository,
    SessionRepository,
    WindowRepository,
)
from backend.features.engine import FeatureEngine
from backend.inference.engine import InferenceEngine
from backend.ingestion.behaviour import BehaviourCollector
from backend.ingestion.service import IngestionService
from backend.personalization.engine import PersonalizationEngine
from backend.quality.engine import DataQualityEngine
from backend.storage.sqlite_repo import (
    SQLiteEventRepository,
    SQLiteFeatureRepository,
    SQLiteInferenceRepository,
    SQLiteSessionRepository,
    SQLiteWindowRepository,
)
from backend.synchronization.engine import SynchronizationEngine


class SessionOrchestrator:
    def __init__(
        self,
        session_repo: Optional[SessionRepository] = None,
        event_repo: Optional[EventRepository] = None,
        window_repo: Optional[WindowRepository] = None,
        feature_repo: Optional[FeatureRepository] = None,
        inference_repo: Optional[InferenceRepository] = None,
    ):
        self.session_repo = session_repo or SQLiteSessionRepository()
        self.event_repo = event_repo or SQLiteEventRepository()
        self.window_repo = window_repo or SQLiteWindowRepository()
        self.feature_repo = feature_repo or SQLiteFeatureRepository()
        self.inference_repo = inference_repo or SQLiteInferenceRepository()

        # Engine instances
        self.quality_engine = DataQualityEngine()
        self.sync_engine = SynchronizationEngine(quality_engine=self.quality_engine)
        self.personalization_engine = PersonalizationEngine()
        self.feature_engine = FeatureEngine(personalization_engine=self.personalization_engine)
        self.inference_engine = InferenceEngine()
        self.adaptation_engine = AdaptationEngine()
        self.feedback_engine = FeedbackEngine()
        self.behaviour_collector = BehaviourCollector()
        self.ingestion_service = IngestionService(
            event_repo=self.event_repo, session_repo=self.session_repo
        )

    async def create_session(
        self,
        participant_key: str,
        task_id: str = "adaptive_arithmetic",
        mode: SessionMode = SessionMode.SIMULATED,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Session:
        """Create a new research session."""
        session_id = f"sess_{uuid.uuid4().hex[:10]}"
        session = Session(
            id=session_id,
            participant_key=participant_key,
            task_id=task_id,
            mode=mode,
            status=SessionStatus.CREATED,
            metadata=metadata or {},
        )
        return await self.session_repo.create(session)

    async def start_session(self, session_id: str) -> Optional[Session]:
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            return None

        # Guarantee invariant: Only ONE session can be RUNNING at any given time
        await self.session_repo.stop_all_running(except_session_id=session_id)

        session.status = SessionStatus.RUNNING
        session.started_at = datetime.now(timezone.utc)
        return await self.session_repo.update(session)

    async def pause_session(self, session_id: str) -> Optional[Session]:
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            return None
        session.status = SessionStatus.PAUSED
        return await self.session_repo.update(session)

    async def resume_session(self, session_id: str) -> Optional[Session]:
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            return None
        session.status = SessionStatus.RUNNING
        return await self.session_repo.update(session)

    async def stop_session(self, session_id: str) -> Optional[Session]:
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            return None
        session.status = SessionStatus.STOPPED
        session.ended_at = datetime.now(timezone.utc)
        self.ingestion_service.clear_buffer(session_id)
        return await self.session_repo.update(session)

    async def run_deterministic_scenario(
        self,
        session_id: str,
        seed: int = 42,
        duration_seconds: float = 270.0,
    ) -> Dict[str, Any]:
        """Execute the complete deterministic 5-phase demonstration scenario."""
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # 1. Initialize Simulator
        sim = SimulatorProvider(seed=seed)
        await sim.connect()
        start_time = session.started_at or datetime.now(timezone.utc)

        # 2. Generate canonical events across all 5 scenario phases
        events = await sim.generate_events(
            session_id=session_id,
            start_time=start_time,
            duration_seconds=duration_seconds,
        )

        # 3. Calibrate initial personal baseline from the first 60 seconds (Phase 1 Baseline)
        baseline_events = [
            e for e in events
            if (e.timestamp - start_time).total_seconds() <= 60.0
        ]
        baseline_profile = self.personalization_engine.calibrate_baseline_from_events(
            participant_key=session.participant_key,
            baseline_events=baseline_events,
        )
        session.baseline_id = baseline_profile.baseline_id
        await self.session_repo.update(session)

        # 4. Ingest events into persistent storage and live buffer
        await self.ingestion_service.ingest_batch(events)

        # 5. Execute sliding window synchronization
        window_tuples = self.sync_engine.create_sliding_windows(
            session_id=session_id,
            events=events,
            session_start_time=start_time,
        )

        windows: List[SignalWindow] = []
        feature_vectors: List[FeatureVector] = []
        inferences: List[InferenceOutput] = []
        interventions: List[AdaptationDecision] = []

        # 6. Step through every window sequentially through the pipeline
        for win, win_events in window_tuples:
            saved_win = await self.window_repo.save_window(win)
            windows.append(saved_win)

            # Feature extraction
            fv = self.feature_engine.compute_features(
                window=saved_win,
                events=win_events,
                participant_key=session.participant_key,
                session_start_time=start_time,
            )
            saved_fv = await self.feature_repo.save_features(fv)
            feature_vectors.append(saved_fv)

            # Cognitive state inference & confidence gating
            inf = self.inference_engine.run_inference(saved_fv)
            saved_inf = await self.inference_repo.save_inference(inf)
            inferences.append(saved_inf)

            # Adaptation engine policy evaluation
            decision = await self.adaptation_engine.evaluate_and_record(saved_inf)
            if decision:
                interventions.append(decision)

        return {
            "session_id": session_id,
            "status": "COMPLETED",
            "events_generated": len(events),
            "windows_count": len(windows),
            "features_count": len(feature_vectors),
            "inferences_count": len(inferences),
            "interventions_count": len(interventions),
            "baseline_profile": baseline_profile.model_dump(),
        }

    async def process_live_window(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Process the latest sliding window from live accumulated events."""
        session = await self.session_repo.get_by_id(session_id)
        if not session or session.status != SessionStatus.RUNNING:
            return None

        events = await self.event_repo.get_events_for_session(session_id)
        if not events:
            return None

        window_tuples = self.sync_engine.create_sliding_windows(
            session_id=session_id,
            events=events,
            session_start_time=session.started_at,
        )
        if not window_tuples:
            return None

        # Take the most recent complete window
        latest_win, latest_events = window_tuples[-1]
        saved_win = await self.window_repo.save_window(latest_win)

        # Feature Extraction
        fv = self.feature_engine.compute_features(
            window=saved_win,
            events=latest_events,
            participant_key=session.participant_key,
            session_start_time=session.started_at,
        )
        saved_fv = await self.feature_repo.save_features(fv)

        # Inference
        inf = self.inference_engine.run_inference(saved_fv)
        saved_inf = await self.inference_repo.save_inference(inf)

        # Adaptation
        decision = await self.adaptation_engine.evaluate_and_record(saved_inf)

        return {
            "window": saved_win.model_dump(),
            "features": saved_fv.model_dump(),
            "inference": saved_inf.model_dump(),
            "adaptation": decision.model_dump() if decision else None,
        }

    async def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        """Fetch comprehensive session timeline for review and Follow-the-Signal inspection."""
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        windows = await self.window_repo.get_windows_for_session(session_id)
        features = await self.feature_repo.get_for_session(session_id)
        inferences = await self.inference_repo.get_timeline_for_session(session_id)
        interventions = await self.adaptation_engine.get_session_interventions(session_id)
        feedback = await self.feedback_engine.get_session_feedback(session_id)

        return {
            "session": session.model_dump(),
            "windows": [w.model_dump() for w in windows],
            "features": [f.model_dump() for f in features],
            "inferences": [i.model_dump() for i in inferences],
            "interventions": [a.model_dump() for a in interventions],
            "feedback": [fb.model_dump() for fb in feedback],
        }
