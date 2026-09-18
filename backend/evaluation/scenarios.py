"""Controlled Scenario Definitions for Flowstate Phase 4.

Complies with Phase 4 Specification:
- Deterministic, versioned behavioral scenarios (A through E).
- Strict separation of Context vs. Observed Behavioral Signals.
- Zero fabricated physiological data (uses COMPUTER_BEHAVIOR only).
- Non-causal descriptive framing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid

from backend.domain.models import CanonicalEvent, SignalType, SourceType


@dataclass(frozen=True)
class ControlledScenario:
    scenario_id: str
    scenario_version: str
    category: str
    name: str
    description: str
    expected_observation: str
    duration_seconds: float
    target_context: Dict[str, Any]
    telemetry_profile: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "scenario_version": self.scenario_version,
            "category": self.category,
            "name": self.name,
            "description": self.description,
            "expected_observation": self.expected_observation,
            "duration_seconds": self.duration_seconds,
            "target_context": self.target_context,
            "telemetry_profile": self.telemetry_profile,
        }


# Standard Version 1.0.0 Evaluation Scenarios
SCENARIOS: Dict[str, ControlledScenario] = {
    "steady_baseline": ControlledScenario(
        scenario_id="steady_baseline",
        scenario_version="1.0.0",
        category="behavioral_control",
        name="Scenario A: Steady Baseline",
        description="Stable interaction with regular response cadence and minimal interruptions",
        expected_observation="Relatively stable behavioral timing, minimal pauses, and low error frequency",
        duration_seconds=120.0,
        target_context={
            "platform": "leetcode",
            "task_id": "two-sum",
            "page_title": "1. Two Sum - LeetCode",
            "difficulty": 1.0,
            "difficulty_label": "Easy",
            "language": "python3",
            "environmental_metadata_only": True,
        },
        telemetry_profile={
            "typing_interval_mean_ms": 480.0,
            "typing_interval_std_ms": 35.0,
            "pause_count": 0,
            "pause_duration_seconds": 0.0,
            "error_rate": 0.02,
            "backspace_count": 2,
            "delete_count": 0,
            "active_time_seconds": 118.0,
            "code_run_count": 5,
        },
    ),
    "pause_heavy": ControlledScenario(
        scenario_id="pause_heavy",
        scenario_version="1.0.0",
        category="behavioral_control",
        name="Scenario B: Pause-Heavy Interaction",
        description="Repeated intentional pauses and longer idle intervals under identical task context",
        expected_observation="Increased pause frequency (+5 pauses) and elevated cumulative pause duration (+42.0s)",
        duration_seconds=120.0,
        target_context={
            "platform": "leetcode",
            "task_id": "two-sum",
            "page_title": "1. Two Sum - LeetCode",
            "difficulty": 1.0,
            "difficulty_label": "Easy",
            "language": "python3",
            "environmental_metadata_only": True,
        },
        telemetry_profile={
            "typing_interval_mean_ms": 520.0,
            "typing_interval_std_ms": 145.0,
            "pause_count": 5,
            "pause_duration_seconds": 42.0,
            "error_rate": 0.02,
            "backspace_count": 3,
            "delete_count": 0,
            "active_time_seconds": 76.0,
            "code_run_count": 4,
        },
    ),
    "error_heavy": ControlledScenario(
        scenario_id="error_heavy",
        scenario_version="1.0.0",
        category="behavioral_control",
        name="Scenario C: Error-Heavy Interaction",
        description="Increased interaction errors and revision frequency with normal interaction cadence",
        expected_observation="Elevated observed error rate (0.38) and increased backspace activity (24 count)",
        duration_seconds=120.0,
        target_context={
            "platform": "leetcode",
            "task_id": "two-sum",
            "page_title": "1. Two Sum - LeetCode",
            "difficulty": 1.0,
            "difficulty_label": "Easy",
            "language": "python3",
            "environmental_metadata_only": True,
        },
        telemetry_profile={
            "typing_interval_mean_ms": 500.0,
            "typing_interval_std_ms": 40.0,
            "pause_count": 0,
            "pause_duration_seconds": 0.0,
            "error_rate": 0.38,
            "backspace_count": 24,
            "delete_count": 0,
            "active_time_seconds": 115.0,
            "code_run_count": 5,
        },
    ),
    "reduced_activity": ControlledScenario(
        scenario_id="reduced_activity",
        scenario_version="1.0.0",
        category="behavioral_control",
        name="Scenario D: Reduced-Activity / Disengagement Simulation",
        description="Reduced interaction frequency, elongated inter-action intervals, and diminished throughput",
        expected_observation="Observed activity reduction: elongated typing intervals (880ms) and low code execution throughput (1 run)",
        duration_seconds=120.0,
        target_context={
            "platform": "leetcode",
            "task_id": "two-sum",
            "page_title": "1. Two Sum - LeetCode",
            "difficulty": 1.0,
            "difficulty_label": "Easy",
            "language": "python3",
            "environmental_metadata_only": True,
        },
        telemetry_profile={
            "typing_interval_mean_ms": 880.0,
            "typing_interval_std_ms": 110.0,
            "pause_count": 3,
            "pause_duration_seconds": 28.0,
            "error_rate": 0.0,
            "backspace_count": 1,
            "delete_count": 0,
            "active_time_seconds": 45.0,
            "code_run_count": 1,
        },
    ),
    "sustained_duration": ControlledScenario(
        scenario_id="sustained_duration",
        scenario_version="1.0.0",
        category="behavioral_control",
        name="Scenario E: Sustained Task Duration",
        description="Continuous task session testing progressive elapsed time-on-task behavior",
        expected_observation="Tracked continuous session duration (320s elapsed time-on-task) with steady behavioral cadence",
        duration_seconds=320.0,
        target_context={
            "platform": "leetcode",
            "task_id": "two-sum",
            "page_title": "1. Two Sum - LeetCode",
            "difficulty": 1.0,
            "difficulty_label": "Easy",
            "language": "python3",
            "environmental_metadata_only": True,
        },
        telemetry_profile={
            "typing_interval_mean_ms": 490.0,
            "typing_interval_std_ms": 45.0,
            "pause_count": 1,
            "pause_duration_seconds": 4.0,
            "error_rate": 0.02,
            "backspace_count": 3,
            "delete_count": 0,
            "active_time_seconds": 312.0,
            "code_run_count": 8,
        },
    ),
}


def get_scenario(scenario_id: str) -> Optional[ControlledScenario]:
    return SCENARIOS.get(scenario_id)


def list_scenarios() -> List[Dict[str, Any]]:
    return [s.to_dict() for s in SCENARIOS.values()]


def generate_scenario_events(
    scenario: ControlledScenario,
    session_id: str,
    start_time: datetime,
    seed: int = 42,
) -> List[CanonicalEvent]:
    """Generate deterministic canonical telemetry events strictly reflecting the scenario's controlled behavioral parameters.
    
    Zero fabricated physiology: Only produces COMPUTER_BEHAVIOR events with TASK_EVENT signal type.
    """
    profile = scenario.telemetry_profile
    ctx = scenario.target_context

    # Construct the canonical payload exactly matching extension / browser-telemetry ingestion schema
    payload = {
        "action": "BROWSER_INTERACTION_BATCH",
        "platform": ctx.get("platform", "leetcode"),
        "page_title": ctx.get("page_title", "Two Sum - LeetCode"),
        "difficulty": ctx.get("difficulty", 1.0),
        "typing_interval_mean_ms": profile["typing_interval_mean_ms"],
        "typing_interval_std_ms": profile["typing_interval_std_ms"],
        "backspace_count": profile["backspace_count"],
        "delete_count": profile.get("delete_count", 0),
        "pause_count": profile["pause_count"],
        "pause_duration_seconds": profile["pause_duration_seconds"],
        "active_time_seconds": profile["active_time_seconds"],
        "code_run_count": profile["code_run_count"],
        "error_rate": profile["error_rate"],
        "behavior": {
            "typing_interval_mean_ms": profile["typing_interval_mean_ms"],
            "typing_interval_std_ms": profile["typing_interval_std_ms"],
            "pause_count": profile["pause_count"],
            "pause_duration_seconds": profile["pause_duration_seconds"],
            "active_time_seconds": profile["active_time_seconds"],
            "error_rate": profile["error_rate"],
            "backspace_count": profile["backspace_count"],
            "code_run_count": profile["code_run_count"],
        },
        "context": {
            "context_schema_version": "1.0.0",
            "platform": ctx.get("platform", "leetcode"),
            "task": {
                "task_id": ctx.get("task_id", "two-sum"),
                "task_title": ctx.get("page_title", "Two Sum"),
                "difficulty_label": ctx.get("difficulty_label", "Easy"),
                "difficulty_scalar": ctx.get("difficulty", 1.0),
                "environmental_metadata_only": True,
            },
        },
        "evaluation_metadata": {
            "scenario_id": scenario.scenario_id,
            "scenario_version": scenario.scenario_version,
            "evaluation_schema_version": "1.0.0",
            "seed": seed,
            "controlled_condition": True,
        },
    }

    # Deterministic event timestamp: halfway into the evaluation window
    event_timestamp = start_time + timedelta(seconds=min(15.0, scenario.duration_seconds / 2.0))

    event = CanonicalEvent(
        id=f"evt_eval_{session_id}_{scenario.scenario_id}_{seed}",
        session_id=session_id,
        timestamp=event_timestamp,
        source_type=SourceType.SIMULATED,
        source_device="Flowstate Controlled Evaluation Engine (Deterministic Replay)",
        signal_type=SignalType.TASK_EVENT,
        value=payload,
        unit="browser_telemetry_batch",
        quality=1.0,
        metadata=payload,
    )

    return [event]
