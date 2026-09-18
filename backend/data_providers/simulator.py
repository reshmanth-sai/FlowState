"""Deterministic scenario simulator for Flowstate.

Complies with Section 19 & Section 37 of Master Specification:
- Deterministic random seed (default 42).
- Temporal continuity with smooth transitions across 5 defined phases:
    1. Baseline (0 - 60s)
    2. Demand Increase (60 - 120s)
    3. Sustained High Workload (120 - 180s)
    4. Intervention Point & Action (180 - 210s)
    5. Recovery (210 - 270s)
- Generates synchronized wearable (HR, Motion) and behavioral task events.
- All events strictly labeled SourceType.SIMULATED.
- Supports fault injection for testing: missing samples, degraded quality, dropped modalities.
"""

from __future__ import annotations

import math
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from backend.data_providers.base import DataProvider
from backend.domain.models import CanonicalEvent, SignalType, SourceType


class ScenarioPhase:
    BASELINE = "BASELINE"
    DEMAND_INCREASE = "DEMAND_INCREASE"
    HIGH_WORKLOAD = "HIGH_WORKLOAD"
    INTERVENTION = "INTERVENTION"
    RECOVERY = "RECOVERY"


class SimulatorProvider(DataProvider):
    def __init__(
        self,
        seed: int = 42,
        inject_missing_modality: Optional[str] = None,
        inject_noise: bool = False,
    ):
        self._seed = seed
        self._rng = random.Random(seed)
        self._inject_missing_modality = inject_missing_modality
        self._inject_noise = inject_noise
        self._connected = True
        self._device_name = f"Flowstate Deterministic Simulator (seed={seed})"

    @property
    def provider_id(self) -> str:
        return f"sim_{self._seed}"

    @property
    def source_type(self) -> SourceType:
        return SourceType.SIMULATED

    async def connect(self) -> bool:
        self._connected = True
        return True

    async def disconnect(self) -> None:
        self._connected = False

    async def health(self) -> Dict[str, Any]:
        return {
            "status": "HEALTHY" if self._connected else "DISCONNECTED",
            "provider_id": self.provider_id,
            "source_type": self.source_type.value,
            "device": self._device_name,
            "seed": self._seed,
            "deterministic": True,
        }

    def capabilities(self) -> Dict[str, Any]:
        return {
            "signals": ["heart_rate", "motion", "task_event"],
            "sample_rate_hz": {"heart_rate": 1.0, "motion": 0.5},
            "supports_rr": False,  # Consumer PPG HR only - strictly no fake ECG/RR
            "supports_eda": False, # Expose false unless device hardware provides it
            "is_simulation": True,
        }

    def get_phase_for_time(self, elapsed_seconds: float) -> str:
        if elapsed_seconds < 60.0:
            return ScenarioPhase.BASELINE
        elif elapsed_seconds < 120.0:
            return ScenarioPhase.DEMAND_INCREASE
        elif elapsed_seconds < 180.0:
            return ScenarioPhase.HIGH_WORKLOAD
        elif elapsed_seconds < 210.0:
            return ScenarioPhase.INTERVENTION
        else:
            return ScenarioPhase.RECOVERY

    async def generate_events(
        self, session_id: str, start_time: datetime, duration_seconds: float = 270.0
    ) -> List[CanonicalEvent]:
        """Generate a deterministic sequence of canonical events spanning the duration."""
        events: List[CanonicalEvent] = []
        if not self._connected:
            return events

        # Reset RNG to ensure reproducibility for the same parameters
        rng = random.Random(self._seed)

        # Baseline starting values
        current_hr = 71.5
        current_motion = 0.08

        # Step at 1.0 second resolution
        step_hz = 1.0
        total_steps = int(duration_seconds * step_hz)

        # Task interaction schedule
        next_task_time = 3.0
        task_difficulty = 1.0  # 1: Low, 2: Medium, 3: High, 4: Overload

        for step in range(total_steps):
            elapsed = step / step_hz
            current_time = start_time + timedelta(seconds=elapsed)
            phase = self.get_phase_for_time(elapsed)

            # Update target state parameters based on phase
            if phase == ScenarioPhase.BASELINE:
                target_hr = 72.0 + 2.0 * math.sin(elapsed / 10.0)
                target_motion = 0.05 + 0.03 * rng.random()
                task_difficulty = 1.0
                mean_rt = 410.0
                error_prob = 0.03
            elif phase == ScenarioPhase.DEMAND_INCREASE:
                progress = (elapsed - 60.0) / 60.0
                target_hr = 73.0 + 12.0 * progress
                target_motion = 0.12 + 0.08 * rng.random()
                task_difficulty = 1.0 + 2.0 * progress
                mean_rt = 410.0 + 240.0 * progress
                error_prob = 0.03 + 0.12 * progress
            elif phase == ScenarioPhase.HIGH_WORKLOAD:
                target_hr = 88.0 + 5.0 * math.sin(elapsed / 8.0)
                target_motion = 0.22 + 0.10 * rng.random()
                task_difficulty = 3.0
                mean_rt = 750.0 + 100.0 * (rng.random() - 0.5)
                error_prob = 0.24
            elif phase == ScenarioPhase.INTERVENTION:
                # Break suggested / accepted, pacing adjusted
                progress = (elapsed - 180.0) / 30.0
                target_hr = 88.0 - 10.0 * progress
                target_motion = 0.04  # Resting
                task_difficulty = 1.5
                mean_rt = 550.0 - 100.0 * progress
                error_prob = 0.08
            else:  # RECOVERY
                target_hr = 74.0 + 2.0 * math.sin(elapsed / 12.0)
                target_motion = 0.06 + 0.02 * rng.random()
                task_difficulty = 1.8
                mean_rt = 440.0 + 40.0 * (rng.random() - 0.5)
                error_prob = 0.05

            # Smooth physiological drift (Ornstein-Uhlenbeck process)
            noise_factor = 2.5 if self._inject_noise else 0.8
            current_hr += 0.25 * (target_hr - current_hr) + noise_factor * (rng.random() - 0.5)
            current_motion += 0.3 * (target_motion - current_motion) + 0.02 * (rng.random() - 0.5)
            current_motion = max(0.0, min(1.0, current_motion))

            # 1. Heart Rate Event (unless modality masked)
            if self._inject_missing_modality != "heart_rate":
                # Occasional sensor quality jitter
                quality = 0.98 if not self._inject_noise else max(0.4, 1.0 - 0.6 * rng.random())
                events.append(
                    CanonicalEvent(
                        id=f"evt_hr_{uuid.uuid4().hex[:10]}",
                        session_id=session_id,
                        timestamp=current_time,
                        source_type=SourceType.SIMULATED,
                        source_device=self._device_name,
                        signal_type=SignalType.HEART_RATE,
                        value=round(current_hr, 1),
                        unit="bpm",
                        quality=round(quality, 2),
                        metadata={"phase": phase, "task_difficulty": round(task_difficulty, 1)},
                    )
                )

            # 2. Motion Event (every 2 seconds)
            if step % 2 == 0 and self._inject_missing_modality != "motion":
                events.append(
                    CanonicalEvent(
                        id=f"evt_mot_{uuid.uuid4().hex[:10]}",
                        session_id=session_id,
                        timestamp=current_time,
                        source_type=SourceType.SIMULATED,
                        source_device=self._device_name,
                        signal_type=SignalType.MOTION,
                        value=round(current_motion, 3),
                        unit="g_intensity",
                        quality=1.0,
                        metadata={"phase": phase},
                    )
                )

            # 3. Task Telemetry Events
            if elapsed >= next_task_time:
                # During intervention break, user pauses or responds slower
                is_correct = rng.random() > error_prob
                rt = max(250.0, rng.gauss(mean_rt, 50.0))
                events.append(
                    CanonicalEvent(
                        id=f"evt_task_{uuid.uuid4().hex[:10]}",
                        session_id=session_id,
                        timestamp=current_time,
                        source_type=SourceType.SIMULATED,
                        source_device="Flowstate Task Runtime",
                        signal_type=SignalType.TASK_EVENT,
                        value={
                            "action": "ANSWER_SUBMITTED",
                            "correct": is_correct,
                            "response_time_ms": round(rt, 1),
                            "difficulty": round(task_difficulty, 1),
                            "phase": phase,
                        },
                        unit="task_telemetry",
                        quality=1.0,
                        metadata={
                            "response_time_ms": round(rt, 1),
                            "correct": is_correct,
                            "difficulty": round(task_difficulty, 1),
                            "phase": phase,
                        },
                    )
                )
                # Next task item spacing (2-5 seconds depending on workload)
                spacing = 4.0 if phase != ScenarioPhase.HIGH_WORKLOAD else 2.5
                next_task_time = elapsed + spacing + (rng.random() * 1.5)

        return events
