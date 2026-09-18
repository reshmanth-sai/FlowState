"""Domain models and data contracts for Flowstate.

Strictly follows the Flowstate Master Implementation Specification:
- Canonical events with provenance
- Signal windows with completeness and quality
- Feature vectors with explicit availability masks
- Cognitive state estimates (workload, fatigue, engagement) with confidence
- Closed-loop adaptation decisions with cooldowns and outcomes
- Task definition contracts
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class SessionMode(str, Enum):
    SIMULATED = "SIMULATED"
    IMPORTED = "IMPORTED"
    REAL_WEARABLE = "REAL_WEARABLE"


class SessionStatus(str, Enum):
    CREATED = "CREATED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    STOPPED = "STOPPED"


class SourceType(str, Enum):
    REAL_WEARABLE = "REAL_WEARABLE"
    IMPORTED = "IMPORTED"
    SIMULATED = "SIMULATED"
    COMPUTER_BEHAVIOR = "COMPUTER_BEHAVIOR"
    SELF_REPORT = "SELF_REPORT"
    DERIVED = "DERIVED"


class SignalType(str, Enum):
    HEART_RATE = "heart_rate"
    RR_INTERVAL = "rr_interval"
    MOTION = "motion"
    EDA = "eda"
    TASK_EVENT = "task_event"
    SELF_REPORT = "self_report"
    DERIVED_FEATURE = "derived_feature"


class QualityGate(str, Enum):
    PASS = "PASS"
    DEGRADED = "DEGRADED"
    INSUFFICIENT = "INSUFFICIENT"


class StateLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    ELEVATED = "ELEVATED"
    REDUCED = "REDUCED"


class AdaptationAction(str, Enum):
    NO_ACTION = "NO_ACTION"
    SUGGEST_SHORT_BREAK = "SUGGEST_SHORT_BREAK"
    REDUCE_DIFFICULTY = "REDUCE_DIFFICULTY"
    PACING_ADJUSTMENT = "PACING_ADJUSTMENT"
    ATTENTION_PROMPT = "ATTENTION_PROMPT"


class InterventionStatus(str, Enum):
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    DISMISSED = "DISMISSED"
    POSTPONED = "POSTPONED"
    EXPIRED = "EXPIRED"


# ==========================================
# Domain Entities
# ==========================================

class Session(BaseModel):
    id: str
    participant_key: str = Field(description="Pseudonymous participant key")
    task_id: str
    mode: SessionMode = SessionMode.SIMULATED
    status: SessionStatus = SessionStatus.CREATED
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    baseline_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CanonicalEvent(BaseModel):
    id: str
    session_id: str
    timestamp: datetime
    source_type: SourceType
    source_device: Optional[str] = "Flowstate Simulator"
    signal_type: SignalType
    value: Union[float, int, str, Dict[str, Any]]
    unit: str
    quality: float = Field(ge=0.0, le=1.0, default=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SignalWindow(BaseModel):
    window_id: str
    session_id: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float = 30.0
    completeness: float = Field(ge=0.0, le=1.0, default=1.0)
    quality_summary: Dict[str, float] = Field(default_factory=dict)
    event_counts: Dict[str, int] = Field(default_factory=dict)


class FeatureVector(BaseModel):
    window_id: str
    session_id: str
    feature_version: str = "1.0.0"
    features: Dict[str, Optional[float]] = Field(default_factory=dict)
    availability_mask: Dict[str, bool] = Field(default_factory=dict)
    quality_summary: Dict[str, float] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StateEstimate(BaseModel):
    value: float = Field(ge=0.0, le=1.0, description="Estimated state index [0, 1]")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in estimate")
    level: StateLevel = StateLevel.MODERATE


class InferenceOutput(BaseModel):
    inference_id: str
    session_id: str
    window_id: str
    workload: StateEstimate
    fatigue: StateEstimate
    engagement: StateEstimate
    quality_gate: QualityGate = QualityGate.PASS
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    model_version: str = "baseline_interpretable_v1.0.0"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdaptationDecision(BaseModel):
    intervention_id: str
    session_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    action: AdaptationAction = AdaptationAction.NO_ACTION
    reason: str
    trigger_state: Optional[str] = None
    trigger_estimate: Optional[float] = None
    confidence_requirement: float = 0.65
    cooldown_seconds: int = 120
    status: InterventionStatus = InterventionStatus.OFFERED
    outcome_window_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InterventionFeedback(BaseModel):
    id: str
    intervention_id: str
    session_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_action: InterventionStatus
    user_notes: Optional[str] = None
    post_state_change: Optional[Dict[str, Any]] = None


class TaskDefinition(BaseModel):
    task_id: str
    name: str
    type: str
    difficulty: str = "ADAPTIVE"
    duration_seconds: Optional[int] = 300
    configuration: Dict[str, Any] = Field(default_factory=dict)
    telemetry_schema: Dict[str, Any] = Field(default_factory=dict)


class BaselineProfile(BaseModel):
    baseline_id: str
    participant_key: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    window_count: int = 0
    hr_mean: float = 72.0
    hr_std: float = 4.0
    response_time_mean: float = 450.0
    response_time_std: float = 80.0
    status: str = "CALIBRATED"


class ExperimentRecord(BaseModel):
    id: str
    name: str
    dataset_id: Optional[str] = None
    model_version: str = "baseline_ridge_v1.0.0"
    feature_version: str = "1.0.0"
    modality_configuration: str = "FUSED"  # BEHAVIOUR_ONLY, WEARABLE_ONLY, FUSED
    metrics: Dict[str, Any] = Field(default_factory=dict)
    validation_status: str = "VALIDATION_PENDING"  # Strictly no fabricated results
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EvaluationScenario(BaseModel):
    scenario_id: str
    scenario_version: str = "1.0.0"
    category: str = "behavioral_control"
    name: str
    description: str
    expected_observation: str
    duration_seconds: float = 120.0
    target_context: Dict[str, Any] = Field(default_factory=dict)


class EvaluationRunRecord(BaseModel):
    evaluation_run_id: str
    scenario_id: str
    scenario_version: str = "1.0.0"
    session_id: str
    started_at: datetime
    completed_at: datetime
    feature_version: str = "1.0.0"
    model_version: str = "baseline_interpretable_v1.0.0"
    context_schema_version: str = "1.0.0"
    evaluation_schema_version: str = "1.0.0"
    observations: Dict[str, Any] = Field(default_factory=dict)
    estimates: Dict[str, Any] = Field(default_factory=dict)
    quality: Dict[str, Any] = Field(default_factory=dict)
    adaptation: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    reproducibility: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScenarioComparison(BaseModel):
    comparison_id: str
    evaluation_run_id: str
    baseline_run_id: str
    scenario_id: str
    observations_delta: Dict[str, Any] = Field(default_factory=dict)
    estimates_delta: Dict[str, Any] = Field(default_factory=dict)
    quality_transition: Dict[str, Any] = Field(default_factory=dict)
    adaptation_summary: Dict[str, Any] = Field(default_factory=dict)
    descriptive_narrative: str
    scientific_disclaimer: str = (
        "Evaluation results describe model responses to controlled behavioral observations. "
        "They do not establish clinical ground truth or causal relationships."
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

