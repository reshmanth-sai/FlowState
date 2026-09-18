"""Feature Extraction Engine for Flowstate.

Complies with Section 6 (M09), Section 9, & Section 10 of Master Specification:
- Computes documented versioned features (v1.0.0).
- Explicitly enforces minimum valid sample rules.
- Builds an availability mask for missing modalities without zero-padding.
- Integrates personal baseline differences where available.

FEATURE GOVERNANCE & CONTEXT INTELLIGENCE (Phase 3B):
- Pipeline Architecture:
    RAW BEHAVIORAL OBSERVATION -> BEHAVIORAL FEATURES -> INFERENCE -> STATE ESTIMATION
    TASK CONTEXT -> EXPLANATION / EVIDENCE TRACE / HUD
- Task Context & Environmental Metadata (Non-cognitive grounding):
    * platform, problem_title, language, difficulty_label, last_outcome.
    * task_difficulty_scalar & task_difficulty_mean: Environmental baseline indicators.
    * Purpose: Human-readable trace in Follow the Signal and HUD; strictly non-causal.
    * Invariant: Task difficulty is contextual metadata, NOT cognitive workload (task_difficulty_context != workload).
    * Strictly excluded from cognitive-state inference formulas.
- Behavioral Feature Inputs (Direct behavioral observation):
    * response_time_ms / typing_interval_mean_ms, error_rate, pause_duration_seconds.
- Derived Behavioral Features (Feature Vector v1.0.0):
    * task_response_time_mean, task_response_time_std, task_error_rate,
      task_completion_count, pause_duration_total.
"""

from __future__ import annotations

import math
import statistics
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np

from backend.domain.models import CanonicalEvent, FeatureVector, SignalType, SignalWindow
from backend.features.definitions import FEATURE_REGISTRY
from backend.personalization.engine import PersonalizationEngine


class FeatureEngine:
    def __init__(self, personalization_engine: Optional[PersonalizationEngine] = None):
        self.personalization_engine = personalization_engine or PersonalizationEngine()
        self.feature_version = "1.0.0"

    def compute_features(
        self,
        window: SignalWindow,
        events: List[CanonicalEvent],
        participant_key: Optional[str] = None,
        session_start_time: Optional[datetime] = None,
    ) -> FeatureVector:
        """Extract documented feature vector from window events."""
        features: Dict[str, Optional[float]] = {}
        availability_mask: Dict[str, bool] = {
            "heart_rate": False,
            "motion": False,
            "task_behaviour": False,
            "eda": False,  # Explicitly unsupported / device-dependent
        }

        # Segregate events by signal type
        hr_values: List[float] = []
        hr_timestamps: List[float] = []
        mot_values: List[float] = []
        task_rts: List[float] = []
        task_errors: List[bool] = []
        task_difficulties: List[float] = []
        task_completion_count = 0
        pause_duration_total = 0.0

        for e in events:
            if e.signal_type == SignalType.HEART_RATE and isinstance(e.value, (int, float)):
                hr_values.append(float(e.value))
                hr_timestamps.append(e.timestamp.timestamp())
            elif e.signal_type == SignalType.MOTION and isinstance(e.value, (int, float)):
                mot_values.append(float(e.value))
            elif e.signal_type == SignalType.TASK_EVENT and isinstance(e.value, dict):
                act = e.value.get("action")
                if act == "ANSWER_SUBMITTED":
                    task_completion_count += 1
                    if "response_time_ms" in e.value and e.value["response_time_ms"] is not None:
                        task_rts.append(float(e.value["response_time_ms"]))
                    if "correct" in e.value and e.value["correct"] is not None:
                        task_errors.append(not bool(e.value["correct"]))
                    if "difficulty" in e.value and e.value["difficulty"] is not None:
                        task_difficulties.append(float(e.value["difficulty"]))
                elif act == "BROWSER_INTERACTION_BATCH":
                    runs = int(e.value.get("code_run_count") or 1)
                    task_completion_count += max(1, runs)
                    if "typing_interval_mean_ms" in e.value and e.value["typing_interval_mean_ms"] is not None:
                        task_rts.append(float(e.value["typing_interval_mean_ms"]))
                    elif "response_time_ms" in e.value and e.value["response_time_ms"] is not None:
                        task_rts.append(float(e.value["response_time_ms"]))
                    if "error_rate" in e.value and e.value["error_rate"] is not None:
                        task_errors.append(float(e.value["error_rate"]) > 0.2)
                    elif "correct" in e.value and e.value["correct"] is not None:
                        task_errors.append(not bool(e.value["correct"]))
                    
                    # Context-aware difficulty extraction (supports structured context or legacy flat difficulty)
                    diff_val = None
                    if "context" in e.value and isinstance(e.value["context"], dict):
                        task_info = e.value["context"].get("task") or {}
                        diff_val = task_info.get("difficulty_scalar")
                    if diff_val is None and "difficulty" in e.value and e.value["difficulty"] is not None:
                        diff_val = e.value["difficulty"]
                    if diff_val is not None:
                        try:
                            task_difficulties.append(float(diff_val))
                        except (ValueError, TypeError):
                            pass

                    pause_duration_total += float(e.value.get("pause_duration_seconds", 0.0))
                elif act == "PAUSE_DETECTED":
                    pause_duration_total += float(e.value.get("pause_duration_seconds", 0.0))

        # 1. Wearable Features
        if len(hr_values) >= FEATURE_REGISTRY["hr_mean"].min_valid_samples:
            availability_mask["heart_rate"] = True
            mean_hr = float(np.mean(hr_values))
            features["hr_mean"] = round(mean_hr, 2)
            features["hr_median"] = round(float(np.median(hr_values)), 2)
            features["hr_std"] = round(float(np.std(hr_values, ddof=1)) if len(hr_values) > 1 else 0.0, 2)

            # Heart rate slope (linear regression)
            if len(hr_values) >= 6:
                t_arr = np.array(hr_timestamps) - hr_timestamps[0]
                slope, _ = np.polyfit(t_arr, hr_values, 1)
                features["hr_slope"] = round(float(slope), 4)
            else:
                features["hr_slope"] = 0.0
        else:
            features["hr_mean"] = None
            features["hr_median"] = None
            features["hr_std"] = None
            features["hr_slope"] = None

        if len(mot_values) >= FEATURE_REGISTRY["motion_intensity_mean"].min_valid_samples:
            availability_mask["motion"] = True
            features["motion_intensity_mean"] = round(float(np.mean(mot_values)), 4)
        else:
            features["motion_intensity_mean"] = None

        # 2. Behavioural Features
        if len(task_rts) >= FEATURE_REGISTRY["task_response_time_mean"].min_valid_samples:
            availability_mask["task_behaviour"] = True
            mean_rt = float(np.mean(task_rts))
            features["task_response_time_mean"] = round(mean_rt, 1)
            features["task_response_time_std"] = round(float(np.std(task_rts, ddof=1)) if len(task_rts) > 1 else 0.0, 1)
        else:
            features["task_response_time_mean"] = None
            features["task_response_time_std"] = None

        if len(task_errors) > 0:
            availability_mask["task_behaviour"] = True
            features["task_error_rate"] = round(sum(1 for err in task_errors if err) / len(task_errors), 3)
        else:
            features["task_error_rate"] = None

        features["task_completion_count"] = float(task_completion_count)
        features["pause_duration_total"] = round(pause_duration_total, 2)

        # 3. Temporal & Context Features
        if session_start_time:
            time_on_task = (window.end_time - session_start_time).total_seconds()
            features["time_on_task_seconds"] = max(0.0, round(time_on_task, 1))
        else:
            features["time_on_task_seconds"] = window.duration_seconds

        if task_difficulties:
            features["task_difficulty_mean"] = round(float(np.mean(task_difficulties)), 2)
        else:
            features["task_difficulty_mean"] = 1.0

        # 4. Personalization Baseline Deltas
        if participant_key:
            deltas = self.personalization_engine.compute_deltas(
                participant_key=participant_key,
                current_hr_mean=features.get("hr_mean"),
                current_rt_mean=features.get("task_response_time_mean"),
            )
            features["hr_baseline_delta"] = deltas["hr_baseline_delta"]
            features["response_time_baseline_delta"] = deltas["response_time_baseline_delta"]
        else:
            features["hr_baseline_delta"] = None
            features["response_time_baseline_delta"] = None

        return FeatureVector(
            window_id=window.window_id,
            session_id=window.session_id,
            feature_version=self.feature_version,
            features=features,
            availability_mask=availability_mask,
            quality_summary=window.quality_summary,
            created_at=datetime.now(timezone.utc),
        )
