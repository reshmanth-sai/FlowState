"""Feature Definitions and Metadata Registry for Flowstate.

Complies with Section 10 & Section 39 of Master Specification:
- Every feature has a documented definition, source signal, unit, window requirement, missing policy, and scientific rationale.
- Versioned schema (v1.0.0).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class FeatureDefinition(BaseModel):
    name: str
    group: str  # "wearable", "behavioural", "temporal", "context", "personalization"
    source_signals: List[str]
    unit: str
    window_seconds: float
    min_valid_samples: int
    missing_policy: str  # "MASK_UNAVAILABLE", "PRESERVE_NONE"
    description: str
    rationale: str


FEATURE_REGISTRY: Dict[str, FeatureDefinition] = {
    # Wearable Group
    "hr_mean": FeatureDefinition(
        name="hr_mean",
        group="wearable",
        source_signals=["heart_rate"],
        unit="bpm",
        window_seconds=30.0,
        min_valid_samples=5,
        missing_policy="MASK_UNAVAILABLE",
        description="Arithmetic mean of valid PPG-derived heart rate samples in the window.",
        rationale="Reflects autonomic arousal and physiological activation during cognitive demand.",
    ),
    "hr_median": FeatureDefinition(
        name="hr_median",
        group="wearable",
        source_signals=["heart_rate"],
        unit="bpm",
        window_seconds=30.0,
        min_valid_samples=5,
        missing_policy="MASK_UNAVAILABLE",
        description="Median heart rate sample in the window, robust to momentary motion artifacts.",
        rationale="Provides robust central tendency during arm or hand movements.",
    ),
    "hr_std": FeatureDefinition(
        name="hr_std",
        group="wearable",
        source_signals=["heart_rate"],
        unit="bpm",
        window_seconds=30.0,
        min_valid_samples=5,
        missing_policy="MASK_UNAVAILABLE",
        description="Sample standard deviation of heart rate readings across the window.",
        rationale="Measures heart rate fluctuation; suppression is commonly associated with high sustained workload.",
    ),
    "hr_slope": FeatureDefinition(
        name="hr_slope",
        group="wearable",
        source_signals=["heart_rate"],
        unit="bpm/s",
        window_seconds=30.0,
        min_valid_samples=6,
        missing_policy="MASK_UNAVAILABLE",
        description="Linear trend rate of change in heart rate across the window.",
        rationale="Detects rapid onset of acute mental stress or cognitive fatigue.",
    ),
    "motion_intensity_mean": FeatureDefinition(
        name="motion_intensity_mean",
        group="wearable",
        source_signals=["motion"],
        unit="g_intensity",
        window_seconds=30.0,
        min_valid_samples=2,
        missing_policy="MASK_UNAVAILABLE",
        description="Average movement intensity from wearable accelerometer.",
        rationale="Contextualizes heart rate elevations to differentiate physical movement from mental effort.",
    ),

    # Behavioural Group
    "task_response_time_mean": FeatureDefinition(
        name="task_response_time_mean",
        group="behavioural",
        source_signals=["task_event"],
        unit="ms",
        window_seconds=30.0,
        min_valid_samples=1,
        missing_policy="MASK_UNAVAILABLE",
        description="Average reaction/decision time for questions submitted in the window.",
        rationale="Direct behavioral marker of processing speed and cognitive load.",
    ),
    "task_response_time_std": FeatureDefinition(
        name="task_response_time_std",
        group="behavioural",
        source_signals=["task_event"],
        unit="ms",
        window_seconds=30.0,
        min_valid_samples=2,
        missing_policy="MASK_UNAVAILABLE",
        description="Standard deviation of response times in the window.",
        rationale="High response latency variability indicates attentional lapses or approaching fatigue.",
    ),
    "task_error_rate": FeatureDefinition(
        name="task_error_rate",
        group="behavioural",
        source_signals=["task_event"],
        unit="ratio",
        window_seconds=30.0,
        min_valid_samples=1,
        missing_policy="MASK_UNAVAILABLE",
        description="Fraction of incorrect answers out of total submissions in the window.",
        rationale="Direct performance degradation metric indicating high difficulty or cognitive depletion.",
    ),
    "task_completion_count": FeatureDefinition(
        name="task_completion_count",
        group="behavioural",
        source_signals=["task_event"],
        unit="count",
        window_seconds=30.0,
        min_valid_samples=0,
        missing_policy="PRESERVE_NONE",
        description="Total items completed within the window.",
        rationale="Throughput metric reflecting active task pacing.",
    ),
    "pause_duration_total": FeatureDefinition(
        name="pause_duration_total",
        group="behavioural",
        source_signals=["task_event"],
        unit="seconds",
        window_seconds=30.0,
        min_valid_samples=0,
        missing_policy="PRESERVE_NONE",
        description="Cumulative pause or idle duration during the window.",
        rationale="Prolonged disengagement or hesitation intervals.",
    ),

    # Temporal & Context Group
    "time_on_task_seconds": FeatureDefinition(
        name="time_on_task_seconds",
        group="temporal",
        source_signals=["session_time"],
        unit="seconds",
        window_seconds=30.0,
        min_valid_samples=1,
        missing_policy="PRESERVE_NONE",
        description="Elapsed active session duration from session start.",
        rationale="Primary driver of continuous cognitive fatigue accumulation.",
    ),
    "task_difficulty_mean": FeatureDefinition(
        name="task_difficulty_mean",
        group="context",
        source_signals=["task_event"],
        unit="level",
        window_seconds=30.0,
        min_valid_samples=1,
        missing_policy="PRESERVE_NONE",
        description="Mean difficulty level of task problems presented in the window.",
        rationale="Essential covariate for estimating whether workload is task-driven.",
    ),

    # Personalization Group
    "hr_baseline_delta": FeatureDefinition(
        name="hr_baseline_delta",
        group="personalization",
        source_signals=["heart_rate", "baseline"],
        unit="bpm",
        window_seconds=30.0,
        min_valid_samples=5,
        missing_policy="MASK_UNAVAILABLE",
        description="Difference between current window mean HR and individual calibrated resting baseline.",
        rationale="Accounts for inter-individual baseline physiological variation.",
    ),
    "response_time_baseline_delta": FeatureDefinition(
        name="response_time_baseline_delta",
        group="personalization",
        source_signals=["task_event", "baseline"],
        unit="ms",
        window_seconds=30.0,
        min_valid_samples=1,
        missing_policy="MASK_UNAVAILABLE",
        description="Difference between current window response time and initial baseline reaction latency.",
        rationale="Normalizes for individual cognitive baseline response speeds.",
    ),
}
