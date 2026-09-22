"""SQLite implementation of Flowstate repository interfaces.

Converts between domain entities and relational SQLite records with JSON serialization for nested dicts.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.domain.models import (
    Session,
    SessionMode,
    SessionStatus,
    CanonicalEvent,
    SourceType,
    SignalType,
    SignalWindow,
    FeatureVector,
    InferenceOutput,
    StateEstimate,
    StateLevel,
    QualityGate,
    AdaptationDecision,
    AdaptationAction,
    InterventionStatus,
    InterventionFeedback,
    BaselineProfile,
    ExperimentRecord,
    EvaluationRunRecord,
)
from backend.domain.repositories import (
    SessionRepository,
    EventRepository,
    WindowRepository,
    FeatureRepository,
    InferenceRepository,
    AdaptationRepository,
    BaselineRepository,
    ExperimentRepository,
    EvaluationRepository,
)
from backend.storage.database import DatabaseManager, db_manager


def _to_iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _from_iso(val: Optional[str]) -> Optional[datetime]:
    if val is None:
        return None
    try:
        return datetime.fromisoformat(val)
    except Exception:
        return None


class SQLiteSessionRepository(SessionRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def create(self, session: Session) -> Session:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO sessions (
                        id, participant_key, task_id, mode, status,
                        started_at, ended_at, baseline_id, metadata_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        session.id,
                        session.participant_key,
                        session.task_id,
                        session.mode.value,
                        session.status.value,
                        _to_iso(session.started_at),
                        _to_iso(session.ended_at),
                        session.baseline_id,
                        json.dumps(session.metadata),
                        _to_iso(session.created_at),
                    ),
                )
            return session
        finally:
            conn.close()

    async def get_by_id(self, session_id: str) -> Optional[Session]:
        conn = self.db.get_connection()
        try:
            row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
            if not row:
                return None
            return Session(
                id=row["id"],
                participant_key=row["participant_key"],
                task_id=row["task_id"],
                mode=SessionMode(row["mode"]),
                status=SessionStatus(row["status"]),
                started_at=_from_iso(row["started_at"]),
                ended_at=_from_iso(row["ended_at"]),
                baseline_id=row["baseline_id"],
                metadata=json.loads(row["metadata_json"] or "{}"),
                created_at=_from_iso(row["created_at"]) or datetime.now(timezone.utc),
            )
        finally:
            conn.close()

    async def update(self, session: Session) -> Session:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    UPDATE sessions SET
                        status = ?, started_at = ?, ended_at = ?,
                        baseline_id = ?, metadata_json = ?
                    WHERE id = ?
                    """,
                    (
                        session.status.value,
                        _to_iso(session.started_at),
                        _to_iso(session.ended_at),
                        session.baseline_id,
                        json.dumps(session.metadata),
                        session.id,
                    ),
                )
            return session
        finally:
            conn.close()

    async def list_recent(self, limit: int = 50) -> List[Session]:
        conn = self.db.get_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return [
                Session(
                    id=r["id"],
                    participant_key=r["participant_key"],
                    task_id=r["task_id"],
                    mode=SessionMode(r["mode"]),
                    status=SessionStatus(r["status"]),
                    started_at=_from_iso(r["started_at"]),
                    ended_at=_from_iso(r["ended_at"]),
                    baseline_id=r["baseline_id"],
                    metadata=json.loads(r["metadata_json"] or "{}"),
                    created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
                )
                for r in rows
            ]
        finally:
            conn.close()

    async def stop_all_running(self, except_session_id: Optional[str] = None) -> int:
        conn = self.db.get_connection()
        try:
            now_str = _to_iso(datetime.now(timezone.utc))
            with conn:
                if except_session_id:
                    cursor = conn.execute(
                        "UPDATE sessions SET status = ?, ended_at = ? WHERE status = ? AND id != ?",
                        (SessionStatus.STOPPED.value, now_str, SessionStatus.RUNNING.value, except_session_id),
                    )
                else:
                    cursor = conn.execute(
                        "UPDATE sessions SET status = ?, ended_at = ? WHERE status = ?",
                        (SessionStatus.STOPPED.value, now_str, SessionStatus.RUNNING.value),
                    )
                return cursor.rowcount
        finally:
            conn.close()


class SQLiteEventRepository(EventRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def add_event(self, event: CanonicalEvent) -> CanonicalEvent:
        conn = self.db.get_connection()
        try:
            val_num = float(event.value) if isinstance(event.value, (int, float)) else None
            val_json = json.dumps(event.value) if isinstance(event.value, dict) else None

            with conn:
                conn.execute(
                    """
                    INSERT INTO canonical_events (
                        id, session_id, timestamp, source_type, source_device,
                        signal_type, value_numeric, value_json, unit, quality, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event.id,
                        event.session_id,
                        _to_iso(event.timestamp),
                        event.source_type.value,
                        event.source_device,
                        event.signal_type.value,
                        val_num,
                        val_json,
                        event.unit,
                        event.quality,
                        json.dumps(event.metadata),
                    ),
                )
            return event
        finally:
            conn.close()

    async def add_events_batch(self, events: List[CanonicalEvent]) -> int:
        if not events:
            return 0
        conn = self.db.get_connection()
        try:
            data = []
            for event in events:
                val_num = float(event.value) if isinstance(event.value, (int, float)) else None
                val_json = json.dumps(event.value) if isinstance(event.value, dict) else None
                data.append(
                    (
                        event.id,
                        event.session_id,
                        _to_iso(event.timestamp),
                        event.source_type.value,
                        event.source_device,
                        event.signal_type.value,
                        val_num,
                        val_json,
                        event.unit,
                        event.quality,
                        json.dumps(event.metadata),
                    )
                )
            with conn:
                conn.executemany(
                    """
                    INSERT INTO canonical_events (
                        id, session_id, timestamp, source_type, source_device,
                        signal_type, value_numeric, value_json, unit, quality, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    data,
                )
            return len(data)
        finally:
            conn.close()

    async def get_events_for_session(
        self,
        session_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        signal_type: Optional[str] = None,
    ) -> List[CanonicalEvent]:
        conn = self.db.get_connection()
        try:
            query = "SELECT * FROM canonical_events WHERE session_id = ?"
            params: List[Any] = [session_id]

            if start_time:
                query += " AND timestamp >= ?"
                params.append(_to_iso(start_time))
            if end_time:
                query += " AND timestamp <= ?"
                params.append(_to_iso(end_time))
            if signal_type:
                query += " AND signal_type = ?"
                params.append(signal_type)

            query += " ORDER BY timestamp ASC"
            rows = conn.execute(query, params).fetchall()

            events = []
            for r in rows:
                if r["value_numeric"] is not None:
                    val = r["value_numeric"]
                elif r["value_json"] is not None:
                    val = json.loads(r["value_json"])
                else:
                    val = 0.0

                events.append(
                    CanonicalEvent(
                        id=r["id"],
                        session_id=r["session_id"],
                        timestamp=_from_iso(r["timestamp"]) or datetime.now(timezone.utc),
                        source_type=SourceType(r["source_type"]),
                        source_device=r["source_device"],
                        signal_type=SignalType(r["signal_type"]),
                        value=val,
                        unit=r["unit"],
                        quality=r["quality"],
                        metadata=json.loads(r["metadata_json"] or "{}"),
                    )
                )
            return events
        finally:
            conn.close()


class SQLiteWindowRepository(WindowRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def save_window(self, window: SignalWindow) -> SignalWindow:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO signal_windows (
                        window_id, session_id, start_time, end_time,
                        duration_seconds, completeness, quality_summary_json, event_counts_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        window.window_id,
                        window.session_id,
                        _to_iso(window.start_time),
                        _to_iso(window.end_time),
                        window.duration_seconds,
                        window.completeness,
                        json.dumps(window.quality_summary),
                        json.dumps(window.event_counts),
                    ),
                )
            return window
        finally:
            conn.close()

    async def get_windows_for_session(self, session_id: str) -> List[SignalWindow]:
        conn = self.db.get_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM signal_windows WHERE session_id = ? ORDER BY start_time ASC",
                (session_id,),
            ).fetchall()
            return [
                SignalWindow(
                    window_id=r["window_id"],
                    session_id=r["session_id"],
                    start_time=_from_iso(r["start_time"]) or datetime.now(timezone.utc),
                    end_time=_from_iso(r["end_time"]) or datetime.now(timezone.utc),
                    duration_seconds=r["duration_seconds"],
                    completeness=r["completeness"],
                    quality_summary=json.loads(r["quality_summary_json"] or "{}"),
                    event_counts=json.loads(r["event_counts_json"] or "{}"),
                )
                for r in rows
            ]
        finally:
            conn.close()

    async def get_window_by_id(self, window_id: str) -> Optional[SignalWindow]:
        conn = self.db.get_connection()
        try:
            r = conn.execute(
                "SELECT * FROM signal_windows WHERE window_id = ?", (window_id,)
            ).fetchone()
            if not r:
                return None
            return SignalWindow(
                window_id=r["window_id"],
                session_id=r["session_id"],
                start_time=_from_iso(r["start_time"]) or datetime.now(timezone.utc),
                end_time=_from_iso(r["end_time"]) or datetime.now(timezone.utc),
                duration_seconds=r["duration_seconds"],
                completeness=r["completeness"],
                quality_summary=json.loads(r["quality_summary_json"] or "{}"),
                event_counts=json.loads(r["event_counts_json"] or "{}"),
            )
        finally:
            conn.close()


class SQLiteFeatureRepository(FeatureRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def save_features(self, features: FeatureVector) -> FeatureVector:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO feature_vectors (
                        window_id, session_id, feature_version, features_json,
                        availability_mask_json, quality_summary_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        features.window_id,
                        features.session_id,
                        features.feature_version,
                        json.dumps(features.features),
                        json.dumps(features.availability_mask),
                        json.dumps(features.quality_summary),
                        _to_iso(features.created_at),
                    ),
                )
            return features
        finally:
            conn.close()

    async def get_by_window(self, window_id: str) -> Optional[FeatureVector]:
        conn = self.db.get_connection()
        try:
            r = conn.execute(
                "SELECT * FROM feature_vectors WHERE window_id = ?", (window_id,)
            ).fetchone()
            if not r:
                return None
            return FeatureVector(
                window_id=r["window_id"],
                session_id=r["session_id"],
                feature_version=r["feature_version"],
                features=json.loads(r["features_json"] or "{}"),
                availability_mask=json.loads(r["availability_mask_json"] or "{}"),
                quality_summary=json.loads(r["quality_summary_json"] or "{}"),
                created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
            )
        finally:
            conn.close()

    async def get_for_session(self, session_id: str) -> List[FeatureVector]:
        conn = self.db.get_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM feature_vectors WHERE session_id = ? ORDER BY created_at ASC",
                (session_id,),
            ).fetchall()
            return [
                FeatureVector(
                    window_id=r["window_id"],
                    session_id=r["session_id"],
                    feature_version=r["feature_version"],
                    features=json.loads(r["features_json"] or "{}"),
                    availability_mask=json.loads(r["availability_mask_json"] or "{}"),
                    quality_summary=json.loads(r["quality_summary_json"] or "{}"),
                    created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
                )
                for r in rows
            ]
        finally:
            conn.close()


class SQLiteInferenceRepository(InferenceRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def save_inference(self, inf: InferenceOutput) -> InferenceOutput:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO inferences (
                        inference_id, session_id, window_id,
                        workload_val, workload_conf, workload_level,
                        fatigue_val, fatigue_conf, fatigue_level,
                        engagement_val, engagement_conf, engagement_level,
                        quality_gate, evidence_json, model_version, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        inf.inference_id,
                        inf.session_id,
                        inf.window_id,
                        inf.workload.value,
                        inf.workload.confidence,
                        inf.workload.level.value,
                        inf.fatigue.value,
                        inf.fatigue.confidence,
                        inf.fatigue.level.value,
                        inf.engagement.value,
                        inf.engagement.confidence,
                        inf.engagement.level.value,
                        inf.quality_gate.value,
                        json.dumps(inf.evidence),
                        inf.model_version,
                        _to_iso(inf.created_at),
                    ),
                )
            return inf
        finally:
            conn.close()

    async def get_by_window(self, window_id: str) -> Optional[InferenceOutput]:
        conn = self.db.get_connection()
        try:
            r = conn.execute(
                "SELECT * FROM inferences WHERE window_id = ?", (window_id,)
            ).fetchone()
            if not r:
                return None
            return InferenceOutput(
                inference_id=r["inference_id"],
                session_id=r["session_id"],
                window_id=r["window_id"],
                workload=StateEstimate(
                    value=r["workload_val"],
                    confidence=r["workload_conf"],
                    level=StateLevel(r["workload_level"]),
                ),
                fatigue=StateEstimate(
                    value=r["fatigue_val"],
                    confidence=r["fatigue_conf"],
                    level=StateLevel(r["fatigue_level"]),
                ),
                engagement=StateEstimate(
                    value=r["engagement_val"],
                    confidence=r["engagement_conf"],
                    level=StateLevel(r["engagement_level"]),
                ),
                quality_gate=QualityGate(r["quality_gate"]),
                evidence=json.loads(r["evidence_json"] or "[]"),
                model_version=r["model_version"],
                created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
            )
        finally:
            conn.close()

    async def get_timeline_for_session(self, session_id: str) -> List[InferenceOutput]:
        conn = self.db.get_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM inferences WHERE session_id = ? ORDER BY created_at ASC",
                (session_id,),
            ).fetchall()
            return [
                InferenceOutput(
                    inference_id=r["inference_id"],
                    session_id=r["session_id"],
                    window_id=r["window_id"],
                    workload=StateEstimate(
                        value=r["workload_val"],
                        confidence=r["workload_conf"],
                        level=StateLevel(r["workload_level"]),
                    ),
                    fatigue=StateEstimate(
                        value=r["fatigue_val"],
                        confidence=r["fatigue_conf"],
                        level=StateLevel(r["fatigue_level"]),
                    ),
                    engagement=StateEstimate(
                        value=r["engagement_val"],
                        confidence=r["engagement_conf"],
                        level=StateLevel(r["engagement_level"]),
                    ),
                    quality_gate=QualityGate(r["quality_gate"]),
                    evidence=json.loads(r["evidence_json"] or "[]"),
                    model_version=r["model_version"],
                    created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
                )
                for r in rows
            ]
        finally:
            conn.close()


class SQLiteAdaptationRepository(AdaptationRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def save_decision(self, decision: AdaptationDecision) -> AdaptationDecision:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO adaptations (
                        intervention_id, session_id, timestamp, action, reason,
                        trigger_state, trigger_estimate, confidence_requirement,
                        cooldown_seconds, status, outcome_window_id, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        decision.intervention_id,
                        decision.session_id,
                        _to_iso(decision.timestamp),
                        decision.action.value,
                        decision.reason,
                        decision.trigger_state,
                        decision.trigger_estimate,
                        decision.confidence_requirement,
                        decision.cooldown_seconds,
                        decision.status.value,
                        decision.outcome_window_id,
                        json.dumps(decision.metadata),
                    ),
                )
            return decision
        finally:
            conn.close()

    async def get_decision_by_id(self, intervention_id: str) -> Optional[AdaptationDecision]:
        conn = self.db.get_connection()
        try:
            r = conn.execute(
                "SELECT * FROM adaptations WHERE intervention_id = ?", (intervention_id,)
            ).fetchone()
            if not r:
                return None
            return AdaptationDecision(
                intervention_id=r["intervention_id"],
                session_id=r["session_id"],
                timestamp=_from_iso(r["timestamp"]) or datetime.now(timezone.utc),
                action=AdaptationAction(r["action"]),
                reason=r["reason"],
                trigger_state=r["trigger_state"],
                trigger_estimate=r["trigger_estimate"],
                confidence_requirement=r["confidence_requirement"],
                cooldown_seconds=r["cooldown_seconds"],
                status=InterventionStatus(r["status"]),
                outcome_window_id=r["outcome_window_id"],
                metadata=json.loads(r["metadata_json"] or "{}"),
            )
        finally:
            conn.close()

    async def update_decision(self, decision: AdaptationDecision) -> AdaptationDecision:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    UPDATE adaptations SET
                        status = ?, outcome_window_id = ?, metadata_json = ?
                    WHERE intervention_id = ?
                    """,
                    (
                        decision.status.value,
                        decision.outcome_window_id,
                        json.dumps(decision.metadata),
                        decision.intervention_id,
                    ),
                )
            return decision
        finally:
            conn.close()

    async def get_for_session(self, session_id: str) -> List[AdaptationDecision]:
        conn = self.db.get_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM adaptations WHERE session_id = ? ORDER BY timestamp ASC",
                (session_id,),
            ).fetchall()
            return [
                AdaptationDecision(
                    intervention_id=r["intervention_id"],
                    session_id=r["session_id"],
                    timestamp=_from_iso(r["timestamp"]) or datetime.now(timezone.utc),
                    action=AdaptationAction(r["action"]),
                    reason=r["reason"],
                    trigger_state=r["trigger_state"],
                    trigger_estimate=r["trigger_estimate"],
                    confidence_requirement=r["confidence_requirement"],
                    cooldown_seconds=r["cooldown_seconds"],
                    status=InterventionStatus(r["status"]),
                    outcome_window_id=r["outcome_window_id"],
                    metadata=json.loads(r["metadata_json"] or "{}"),
                )
                for r in rows
            ]
        finally:
            conn.close()

    async def save_feedback(self, feedback: InterventionFeedback) -> InterventionFeedback:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO intervention_feedback (
                        id, intervention_id, session_id, timestamp,
                        user_action, user_notes, post_state_change_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        feedback.id,
                        feedback.intervention_id,
                        feedback.session_id,
                        _to_iso(feedback.timestamp),
                        feedback.user_action.value,
                        feedback.user_notes,
                        json.dumps(feedback.post_state_change) if feedback.post_state_change else None,
                    ),
                )
            return feedback
        finally:
            conn.close()

    async def get_feedback_for_session(self, session_id: str) -> List[InterventionFeedback]:
        conn = self.db.get_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM intervention_feedback WHERE session_id = ? ORDER BY timestamp ASC",
                (session_id,),
            ).fetchall()
            return [
                InterventionFeedback(
                    id=r["id"],
                    intervention_id=r["intervention_id"],
                    session_id=r["session_id"],
                    timestamp=_from_iso(r["timestamp"]) or datetime.now(timezone.utc),
                    user_action=InterventionStatus(r["user_action"]),
                    user_notes=r["user_notes"],
                    post_state_change=json.loads(r["post_state_change_json"]) if r["post_state_change_json"] else None,
                )
                for r in rows
            ]
        finally:
            conn.close()


class SQLiteBaselineRepository(BaselineRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def save_baseline(self, b: BaselineProfile) -> BaselineProfile:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO baselines (
                        baseline_id, participant_key, created_at, window_count,
                        hr_mean, hr_std, response_time_mean, response_time_std, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        b.baseline_id,
                        b.participant_key,
                        _to_iso(b.created_at),
                        b.window_count,
                        b.hr_mean,
                        b.hr_std,
                        b.response_time_mean,
                        b.response_time_std,
                        b.status,
                    ),
                )
            return b
        finally:
            conn.close()

    async def get_baseline(self, baseline_id: str) -> Optional[BaselineProfile]:
        conn = self.db.get_connection()
        try:
            r = conn.execute(
                "SELECT * FROM baselines WHERE baseline_id = ?", (baseline_id,)
            ).fetchone()
            if not r:
                return None
            return BaselineProfile(
                baseline_id=r["baseline_id"],
                participant_key=r["participant_key"],
                created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
                window_count=r["window_count"],
                hr_mean=r["hr_mean"],
                hr_std=r["hr_std"],
                response_time_mean=r["response_time_mean"],
                response_time_std=r["response_time_std"],
                status=r["status"],
            )
        finally:
            conn.close()

    async def get_for_participant(self, participant_key: str) -> Optional[BaselineProfile]:
        conn = self.db.get_connection()
        try:
            r = conn.execute(
                "SELECT * FROM baselines WHERE participant_key = ? ORDER BY created_at DESC LIMIT 1",
                (participant_key,),
            ).fetchone()
            if not r:
                return None
            return BaselineProfile(
                baseline_id=r["baseline_id"],
                participant_key=r["participant_key"],
                created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
                window_count=r["window_count"],
                hr_mean=r["hr_mean"],
                hr_std=r["hr_std"],
                response_time_mean=r["response_time_mean"],
                response_time_std=r["response_time_std"],
                status=r["status"],
            )
        finally:
            conn.close()


class SQLiteExperimentRepository(ExperimentRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def save_experiment(self, exp: ExperimentRecord) -> ExperimentRecord:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO experiments (
                        id, name, dataset_id, model_version, feature_version,
                        modality_configuration, metrics_json, validation_status,
                        description, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        exp.id,
                        exp.name,
                        exp.dataset_id,
                        exp.model_version,
                        exp.feature_version,
                        exp.modality_configuration,
                        json.dumps(exp.metrics),
                        exp.validation_status,
                        exp.description,
                        _to_iso(exp.created_at),
                    ),
                )
            return exp
        finally:
            conn.close()

    async def list_experiments(self) -> List[ExperimentRecord]:
        conn = self.db.get_connection()
        try:
            rows = conn.execute("SELECT * FROM experiments ORDER BY created_at DESC").fetchall()
            return [
                ExperimentRecord(
                    id=r["id"],
                    name=r["name"],
                    dataset_id=r["dataset_id"],
                    model_version=r["model_version"],
                    feature_version=r["feature_version"],
                    modality_configuration=r["modality_configuration"],
                    metrics=json.loads(r["metrics_json"] or "{}"),
                    validation_status=r["validation_status"],
                    description=r["description"] or "",
                    created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
                )
                for r in rows
            ]
        finally:
            conn.close()

    async def get_by_id(self, experiment_id: str) -> Optional[ExperimentRecord]:
        conn = self.db.get_connection()
        try:
            r = conn.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,)).fetchone()
            if not r:
                return None
            return ExperimentRecord(
                id=r["id"],
                name=r["name"],
                dataset_id=r["dataset_id"],
                model_version=r["model_version"],
                feature_version=r["feature_version"],
                modality_configuration=r["modality_configuration"],
                metrics=json.loads(r["metrics_json"] or "{}"),
                validation_status=r["validation_status"],
                description=r["description"] or "",
                created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
            )
        finally:
            conn.close()


class SQLiteEvaluationRepository(EvaluationRepository):
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    async def save_evaluation_run(self, run: EvaluationRunRecord) -> EvaluationRunRecord:
        conn = self.db.get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO evaluation_runs (
                        evaluation_run_id, scenario_id, scenario_version, session_id,
                        started_at, completed_at, feature_version, model_version,
                        context_schema_version, evaluation_schema_version,
                        observations_json, estimates_json, quality_json,
                        adaptation_json, context_json, evidence_json, result_json,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        run.evaluation_run_id,
                        run.scenario_id,
                        run.scenario_version,
                        run.session_id,
                        _to_iso(run.started_at),
                        _to_iso(run.completed_at),
                        run.feature_version,
                        run.model_version,
                        run.context_schema_version,
                        run.evaluation_schema_version,
                        json.dumps(run.observations),
                        json.dumps(run.estimates),
                        json.dumps(run.quality),
                        json.dumps(run.adaptation),
                        json.dumps(run.context),
                        json.dumps(run.evidence),
                        json.dumps(run.model_dump(mode="json")),
                        _to_iso(run.created_at),
                    ),
                )
            return run
        finally:
            conn.close()

    def _row_to_record(self, r) -> EvaluationRunRecord:
        result_data = json.loads(r["result_json"] or "{}")
        repro = result_data.get("reproducibility", {})
        return EvaluationRunRecord(
            evaluation_run_id=r["evaluation_run_id"],
            scenario_id=r["scenario_id"],
            scenario_version=r["scenario_version"],
            session_id=r["session_id"],
            started_at=_from_iso(r["started_at"]) or datetime.now(timezone.utc),
            completed_at=_from_iso(r["completed_at"]) or datetime.now(timezone.utc),
            feature_version=r["feature_version"],
            model_version=r["model_version"],
            context_schema_version=r["context_schema_version"],
            evaluation_schema_version=r["evaluation_schema_version"],
            observations=json.loads(r["observations_json"] or "{}"),
            estimates=json.loads(r["estimates_json"] or "{}"),
            quality=json.loads(r["quality_json"] or "{}"),
            adaptation=json.loads(r["adaptation_json"] or "{}"),
            context=json.loads(r["context_json"] or "{}"),
            evidence=json.loads(r["evidence_json"] or "[]"),
            reproducibility=repro,
            created_at=_from_iso(r["created_at"]) or datetime.now(timezone.utc),
        )

    async def get_by_id(self, run_id: str) -> Optional[EvaluationRunRecord]:
        conn = self.db.get_connection()
        try:
            r = conn.execute(
                "SELECT * FROM evaluation_runs WHERE evaluation_run_id = ?", (run_id,)
            ).fetchone()
            if not r:
                return None
            return self._row_to_record(r)
        finally:
            conn.close()

    async def list_runs(self, limit: int = 50) -> List[EvaluationRunRecord]:
        conn = self.db.get_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM evaluation_runs ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return [self._row_to_record(r) for r in rows]
        finally:
            conn.close()

    async def get_latest_for_scenario(self, scenario_id: str) -> Optional[EvaluationRunRecord]:
        conn = self.db.get_connection()
        try:
            r = conn.execute(
                "SELECT * FROM evaluation_runs WHERE scenario_id = ? ORDER BY created_at DESC LIMIT 1",
                (scenario_id,),
            ).fetchone()
            if not r:
                return None
            return self._row_to_record(r)
        finally:
            conn.close()

