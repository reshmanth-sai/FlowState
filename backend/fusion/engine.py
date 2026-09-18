"""Multimodal Fusion Engine for Flowstate.

Complies with Section 6 (M10) & Section 20 of Master Specification:
- Assembles feature vectors into experimental groups:
    * BEHAVIOUR_ONLY (Task telemetry + context)
    * WEARABLE_ONLY (HR, motion, slope)
    * FUSED (Multimodal: Wearable + Behaviour + Context + Baseline deltas)
- Supports research ablation experiments.
- Manages missing modalities through explicit availability masks rather than zero-padding.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from backend.domain.models import FeatureVector


class FusionModality(str, Enum):
    BEHAVIOUR_ONLY = "BEHAVIOUR_ONLY"
    WEARABLE_ONLY = "WEARABLE_ONLY"
    FUSED = "FUSED"


class FusionEngine:
    def __init__(self):
        # Feature name subsets per modality configuration
        self.behaviour_features = [
            "task_response_time_mean",
            "task_response_time_std",
            "task_error_rate",
            "task_completion_count",
            "pause_duration_total",
            "time_on_task_seconds",
            "task_difficulty_mean",
        ]
        self.wearable_features = [
            "hr_mean",
            "hr_median",
            "hr_std",
            "hr_slope",
            "motion_intensity_mean",
            "time_on_task_seconds",
        ]
        self.fused_features = [
            "hr_mean",
            "hr_std",
            "hr_slope",
            "motion_intensity_mean",
            "task_response_time_mean",
            "task_error_rate",
            "task_completion_count",
            "pause_duration_total",
            "time_on_task_seconds",
            "task_difficulty_mean",
            "hr_baseline_delta",
            "response_time_baseline_delta",
        ]

    def extract_vector(
        self,
        fv: FeatureVector,
        modality: FusionModality = FusionModality.FUSED,
    ) -> Tuple[List[str], List[Optional[float]], Dict[str, bool]]:
        """Extract a filtered, ordered feature subset and corresponding availability status."""
        if modality == FusionModality.BEHAVIOUR_ONLY:
            target_keys = self.behaviour_features
        elif modality == FusionModality.WEARABLE_ONLY:
            target_keys = self.wearable_features
        else:
            target_keys = self.fused_features

        names: List[str] = []
        values: List[Optional[float]] = []

        for k in target_keys:
            names.append(k)
            values.append(fv.features.get(k))

        return names, values, fv.availability_mask
