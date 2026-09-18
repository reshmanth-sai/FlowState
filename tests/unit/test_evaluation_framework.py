"""Unit tests for Flowstate Phase 4 Controlled Evaluation & Evidence Layer.

Complies with Section 14 of Phase 4 Specification:
- Test 1: Steady baseline produces a valid evaluation result.
- Test 2: Pause-heavy scenario produces increased observed pause statistics.
- Test 3: Error-heavy scenario produces increased observed error statistics.
- Test 4: Reduced-activity scenario produces reduced activity statistics.
- Test 5: Sustained-duration scenario correctly tracks time-on-task.
- Test 6: Identical input replay produces identical model outputs.
- Test 7: Task difficulty changes do NOT alter cognitive inference when behavioral/physiological inputs are identical.
- Test 8: Scenario metadata does not alter inference.
- Test 9: Evaluation results preserve telemetry provenance.
- Test 10: Simulated signals, if supported, cannot be persisted as REAL_WEARABLE.
"""

from __future__ import annotations

import copy
import pytest
from datetime import datetime, timezone

from backend.domain.models import (
    CanonicalEvent,
    FeatureVector,
    QualityGate,
    SignalType,
    SignalWindow,
    SourceType,
    StateLevel,
)
from backend.evaluation.engine import EvaluationRunner
from backend.evaluation.scenarios import (
    SCENARIOS,
    get_scenario,
    list_scenarios,
    generate_scenario_events,
)
from backend.inference.baseline_models import BaselineEstimators
from backend.inference.engine import InferenceEngine


@pytest.fixture
def runner():
    return EvaluationRunner()


@pytest.mark.asyncio
async def test_1_steady_baseline_produces_valid_result(runner):
    """Test 1: Steady baseline produces a valid evaluation result."""
    run = await runner.run_scenario("steady_baseline", seed=42)
    assert run.scenario_id == "steady_baseline"
    assert run.scenario_version == "1.0.0"
    assert run.observations["pause_count"] == 0
    assert run.observations["error_rate"] == 0.02
    assert run.estimates["workload"]["value"] >= 0.0
    assert run.estimates["fatigue"]["value"] >= 0.0
    assert run.estimates["engagement"]["value"] >= 0.0
    assert run.quality["gate"] in ["PASS", "DEGRADED"]
    assert "task_behaviour" in run.quality["modalities"]
    assert run.reproducibility["seed"] == 42


@pytest.mark.asyncio
async def test_2_pause_heavy_scenario_produces_increased_pause_statistics(runner):
    """Test 2: Pause-heavy scenario produces increased observed pause statistics."""
    baseline = await runner.run_scenario("steady_baseline", seed=42)
    pause_heavy = await runner.run_scenario("pause_heavy", seed=42)

    # Descriptive comparison
    assert pause_heavy.observations["pause_count"] > baseline.observations["pause_count"]
    assert pause_heavy.observations["pause_duration_total_seconds"] > baseline.observations["pause_duration_total_seconds"]
    assert pause_heavy.observations["typing_interval_std_ms"] > baseline.observations["typing_interval_std_ms"]

    comp = await runner.compare_runs(pause_heavy.evaluation_run_id, baseline.evaluation_run_id)
    assert "pause" in comp.descriptive_narrative.lower()
    # Ensure narrative does not contain causal claim words
    assert "caused" not in comp.descriptive_narrative.lower()
    assert "proved" not in comp.descriptive_narrative.lower()


@pytest.mark.asyncio
async def test_3_error_heavy_scenario_produces_increased_error_statistics(runner):
    """Test 3: Error-heavy scenario produces increased observed error statistics."""
    baseline = await runner.run_scenario("steady_baseline", seed=42)
    error_heavy = await runner.run_scenario("error_heavy", seed=42)

    assert error_heavy.observations["error_rate"] > baseline.observations["error_rate"]
    assert error_heavy.observations["backspace_count"] > baseline.observations["backspace_count"]

    comp = await runner.compare_runs(error_heavy.evaluation_run_id, baseline.evaluation_run_id)
    assert "error" in comp.descriptive_narrative.lower()
    assert "caused" not in comp.descriptive_narrative.lower()


@pytest.mark.asyncio
async def test_4_reduced_activity_scenario_produces_reduced_activity_statistics(runner):
    """Test 4: Reduced-activity scenario produces reduced activity statistics."""
    baseline = await runner.run_scenario("steady_baseline", seed=42)
    reduced = await runner.run_scenario("reduced_activity", seed=42)

    assert reduced.observations["completion_count"] < baseline.observations["completion_count"]
    assert reduced.observations["typing_interval_mean_ms"] > baseline.observations["typing_interval_mean_ms"]
    assert reduced.observations["active_time_seconds"] < baseline.observations["active_time_seconds"]
    # Model response indicates lower estimated engagement
    assert reduced.estimates["engagement"]["value"] < baseline.estimates["engagement"]["value"]


@pytest.mark.asyncio
async def test_5_sustained_duration_scenario_tracks_time_on_task(runner):
    """Test 5: Sustained-duration scenario correctly tracks time-on-task."""
    baseline = await runner.run_scenario("steady_baseline", seed=42)
    sustained = await runner.run_scenario("sustained_duration", seed=42)

    assert sustained.observations["time_on_task_seconds"] >= 300.0
    assert sustained.observations["time_on_task_seconds"] > baseline.observations["time_on_task_seconds"]
    # Demonstrates fatigue estimator's time-on-task component
    assert sustained.estimates["fatigue"]["value"] > baseline.estimates["fatigue"]["value"]


@pytest.mark.asyncio
async def test_6_identical_input_replay_produces_identical_model_outputs(runner):
    """Test 6: Identical input replay produces identical model outputs."""
    run_1 = await runner.run_scenario("steady_baseline", seed=42)
    run_2 = await runner.run_scenario("steady_baseline", seed=42)

    assert run_1.estimates["workload"]["value"] == run_2.estimates["workload"]["value"]
    assert run_1.estimates["fatigue"]["value"] == run_2.estimates["fatigue"]["value"]
    assert run_1.estimates["engagement"]["value"] == run_2.estimates["engagement"]["value"]
    assert run_1.quality["confidence"] == run_2.quality["confidence"]
    assert run_1.quality["gate"] == run_2.quality["gate"]
    assert run_1.adaptation["action"] == run_2.adaptation["action"]


@pytest.mark.asyncio
async def test_7_task_difficulty_changes_do_not_alter_cognitive_inference_preservation():
    """Test 7: Task difficulty changes do NOT alter cognitive inference when behavioral inputs are identical."""
    estimators = BaselineEstimators()
    now = datetime.now(timezone.utc)

    # Easy problem context (1.0)
    fv_easy = FeatureVector(
        window_id="win_diff_test_easy",
        session_id="sess_diff_test",
        feature_version="1.0.0",
        features={
            "task_response_time_mean": 650.0,
            "task_response_time_std": 80.0,
            "task_error_rate": 0.15,
            "task_completion_count": 4.0,
            "pause_duration_total": 5.0,
            "time_on_task_seconds": 120.0,
            "task_difficulty_mean": 1.0,
        },
        availability_mask={"task_behaviour": True},
        quality_summary={"task_behaviour": 1.0},
        created_at=now,
    )

    # Hard problem context (4.0) with exact identical behavioral performance
    fv_hard = FeatureVector(
        window_id="win_diff_test_hard",
        session_id="sess_diff_test",
        feature_version="1.0.0",
        features={
            "task_response_time_mean": 650.0,
            "task_response_time_std": 80.0,
            "task_error_rate": 0.15,
            "task_completion_count": 4.0,
            "pause_duration_total": 5.0,
            "time_on_task_seconds": 120.0,
            "task_difficulty_mean": 4.0,
        },
        availability_mask={"task_behaviour": True},
        quality_summary={"task_behaviour": 1.0},
        created_at=now,
    )

    wl_easy, _ = estimators.estimate_workload(fv_easy)
    wl_hard, _ = estimators.estimate_workload(fv_hard)
    ft_easy, _ = estimators.estimate_fatigue(fv_easy)
    ft_hard, _ = estimators.estimate_fatigue(fv_hard)
    eg_easy, _ = estimators.estimate_engagement(fv_easy)
    eg_hard, _ = estimators.estimate_engagement(fv_hard)

    assert wl_easy == wl_hard, "Task difficulty must NOT alter workload inference directly"
    assert ft_easy == ft_hard, "Task difficulty must NOT alter fatigue inference directly"
    assert eg_easy == eg_hard, "Task difficulty must NOT alter engagement inference directly"


@pytest.mark.asyncio
async def test_8_scenario_metadata_does_not_alter_inference(runner):
    """Test 8: Scenario metadata does not alter cognitive state inference."""
    engine = runner.orchestrator.feature_engine
    estimators = BaselineEstimators()
    now = datetime.now(timezone.utc)
    win = SignalWindow(
        window_id="win_meta_test",
        session_id="sess_meta",
        start_time=now,
        end_time=now,
        duration_seconds=30.0,
    )

    payload_a = {
        "action": "BROWSER_INTERACTION_BATCH",
        "typing_interval_mean_ms": 500.0,
        "error_rate": 0.05,
        "pause_duration_seconds": 2.0,
        "code_run_count": 5,
        "scenario_id": "scenario_alpha_control",
        "scenario_category": "stress_evaluation",
        "experiment_tag": "high_intensity",
    }
    payload_b = {
        "action": "BROWSER_INTERACTION_BATCH",
        "typing_interval_mean_ms": 500.0,
        "error_rate": 0.05,
        "pause_duration_seconds": 2.0,
        "code_run_count": 5,
        "scenario_id": "scenario_beta_control",
        "scenario_category": "calm_evaluation",
        "experiment_tag": "low_intensity",
    }

    evt_a = CanonicalEvent(
        id="evt_meta_a",
        session_id="sess_meta",
        timestamp=now,
        source_type=SourceType.COMPUTER_BEHAVIOR,
        signal_type=SignalType.TASK_EVENT,
        value=payload_a,
        unit="browser_telemetry_batch",
        metadata=payload_a,
    )
    evt_b = CanonicalEvent(
        id="evt_meta_b",
        session_id="sess_meta",
        timestamp=now,
        source_type=SourceType.COMPUTER_BEHAVIOR,
        signal_type=SignalType.TASK_EVENT,
        value=payload_b,
        unit="browser_telemetry_batch",
        metadata=payload_b,
    )

    fv_a = engine.compute_features(win, [evt_a], "participant_test", now)
    fv_b = engine.compute_features(win, [evt_b], "participant_test", now)

    wl_a, _ = estimators.estimate_workload(fv_a)
    wl_b, _ = estimators.estimate_workload(fv_b)
    ft_a, _ = estimators.estimate_fatigue(fv_a)
    ft_b, _ = estimators.estimate_fatigue(fv_b)
    eg_a, _ = estimators.estimate_engagement(fv_a)
    eg_b, _ = estimators.estimate_engagement(fv_b)

    assert wl_a == wl_b, "Scenario metadata must not alter workload calculation"
    assert ft_a == ft_b, "Scenario metadata must not alter fatigue calculation"
    assert eg_a == eg_b, "Scenario metadata must not alter engagement calculation"


@pytest.mark.asyncio
async def test_9_evaluation_results_preserve_telemetry_provenance(runner):
    """Test 9: Evaluation results preserve telemetry provenance as SIMULATED."""
    scenario = get_scenario("steady_baseline")
    events = generate_scenario_events(
        scenario=scenario,
        session_id="sess_prov_test",
        start_time=datetime.now(timezone.utc),
        seed=42,
    )

    assert len(events) > 0
    for evt in events:
        assert evt.source_type == SourceType.SIMULATED, "Synthetic evaluation event must be strictly tagged SIMULATED"
        assert evt.source_type != SourceType.COMPUTER_BEHAVIOR, "Synthetic evaluation events must not masquerade as live COMPUTER_BEHAVIOR"
        assert evt.source_type != SourceType.REAL_WEARABLE, "Synthetic evaluation events must not masquerade as REAL_WEARABLE"
        assert evt.signal_type == SignalType.TASK_EVENT
        assert "Deterministic Replay" in evt.source_device


@pytest.mark.asyncio
async def test_10_simulated_signals_cannot_be_persisted_as_real_wearable_or_live_behavior(runner):
    """Test 10: Synthetic evaluation signals are persisted as SIMULATED, never REAL_WEARABLE or COMPUTER_BEHAVIOR."""
    run = await runner.run_scenario("steady_baseline", seed=42)
    assert run.reproducibility["provenance"] == "SIMULATED"
    assert run.reproducibility["provenance"] != "COMPUTER_BEHAVIOR"
    assert run.reproducibility["provenance"] != "REAL_WEARABLE"

    # Verify that synthetic evaluation telemetry is persisted as SIMULATED in canonical events table
    events = await runner.orchestrator.event_repo.get_events_for_session(run.session_id)
    assert len(events) > 0
    for event in events:
        assert event.source_type == SourceType.SIMULATED, "Synthetic evaluation event must be persisted as SIMULATED"
        assert event.source_type != SourceType.COMPUTER_BEHAVIOR, "Synthetic evaluation event cannot be persisted as live COMPUTER_BEHAVIOR"
        assert event.source_type != SourceType.REAL_WEARABLE, "Synthetic evaluation event cannot be persisted as REAL_WEARABLE"


@pytest.mark.asyncio
async def test_11_cross_scenario_isolation_and_independent_sessions(runner):
    """Test 11: Consecutive execution of scenarios maintains strict state isolation and zero state leakage."""
    scenarios = ["steady_baseline", "pause_heavy", "error_heavy", "reduced_activity", "sustained_duration"]
    runs = []
    for s_id in scenarios:
        r = await runner.run_scenario(s_id, seed=42)
        runs.append(r)

    # 1. Unique sessions and run IDs
    session_ids = [r.session_id for r in runs]
    assert len(session_ids) == len(set(session_ids)), "Session IDs must be strictly unique across evaluation runs"
    run_ids = [r.evaluation_run_id for r in runs]
    assert len(run_ids) == len(set(run_ids)), "Evaluation run IDs must be strictly unique across runs"

    # 2. No feature or parameter leakage between scenarios
    pause_heavy_run = runs[1]
    error_heavy_run = runs[2]
    assert pause_heavy_run.observations["pause_duration_total_seconds"] == 42.0
    assert error_heavy_run.observations["pause_duration_total_seconds"] == 0.0, "Pause state leaked to error_heavy scenario"
    assert error_heavy_run.observations["error_rate"] == 0.38
    assert pause_heavy_run.observations["error_rate"] == 0.02, "Error state leaked to pause_heavy scenario"

    # 3. Post-run fresh baseline produces identical results (no accumulated state)
    fresh_baseline = await runner.run_scenario("steady_baseline", seed=42)
    assert fresh_baseline.observations["pause_count"] == 0
    assert fresh_baseline.observations["error_rate"] == 0.02
    assert fresh_baseline.estimates["workload"]["value"] == runs[0].estimates["workload"]["value"]
    assert fresh_baseline.estimates["fatigue"]["value"] == runs[0].estimates["fatigue"]["value"]
    assert fresh_baseline.estimates["engagement"]["value"] == runs[0].estimates["engagement"]["value"]


@pytest.mark.asyncio
async def test_12_regression_expectations_benchmark(runner):
    """Test 12: REGRESSION EXPECTATION fixture.
    
    NOTE: These values represent empirical baseline outputs produced by the production
    pipeline for regression tracking. They are NOT prescribed targets or hardcoded results.
    """
    REGRESSION_EXPECTATIONS = {
        "steady_baseline": {"workload": 0.09, "fatigue": 0.21, "engagement": 1.00},
        "pause_heavy": {"workload": 0.14, "fatigue": 0.39, "engagement": 0.56},
        "error_heavy": {"workload": 0.42, "fatigue": 0.21, "engagement": 0.80},
        "reduced_activity": {"workload": 0.55, "fatigue": 0.39, "engagement": 0.29},
        "sustained_duration": {"workload": 0.10, "fatigue": 0.52, "engagement": 0.88},
    }

    for scenario_id, expected in REGRESSION_EXPECTATIONS.items():
        run = await runner.run_scenario(scenario_id, seed=42)
        assert run.estimates["workload"]["value"] == expected["workload"], (
            f"Regression mismatch for {scenario_id} workload: {run.estimates['workload']['value']} != {expected['workload']}"
        )
        assert run.estimates["fatigue"]["value"] == expected["fatigue"], (
            f"Regression mismatch for {scenario_id} fatigue: {run.estimates['fatigue']['value']} != {expected['fatigue']}"
        )
        assert run.estimates["engagement"]["value"] == expected["engagement"], (
            f"Regression mismatch for {scenario_id} engagement: {run.estimates['engagement']['value']} != {expected['engagement']}"
        )


@pytest.mark.asyncio
async def test_13_evaluation_scenarios_are_marked_simulated_and_extension_is_computer_behavior(runner):
    """Test 13: Verifies strict provenance segregation between synthetic evaluation scenarios and live extension observations.
    
    1. Phase 4 synthetic scenario -> source_type = SIMULATED, source_device identifies deterministic evaluation/replay.
    2. Real browser extension telemetry -> source_type = COMPUTER_BEHAVIOR, source_device = Flowstate Chrome Extension.
    3. The two must remain distinguishable throughout CanonicalEvent -> SQLite -> Features -> Inference.
    """
    # 1. Evaluate synthetic scenario
    run = await runner.run_scenario("steady_baseline", seed=42)
    eval_events = await runner.orchestrator.event_repo.get_events_for_session(run.session_id)
    assert len(eval_events) > 0
    for evt in eval_events:
        assert evt.source_type == SourceType.SIMULATED
        assert "Deterministic Replay" in evt.source_device
        assert evt.source_type != SourceType.COMPUTER_BEHAVIOR

    # 2. Simulate live browser extension event
    now = datetime.now(timezone.utc)
    live_event = CanonicalEvent(
        id=f"evt_live_test_{now.timestamp()}",
        session_id=run.session_id,
        timestamp=now,
        source_type=SourceType.COMPUTER_BEHAVIOR,
        source_device="Flowstate Chrome Extension",
        signal_type=SignalType.TASK_EVENT,
        value={
            "action": "BROWSER_INTERACTION_BATCH",
            "typing_interval_mean_ms": 320.0,
            "typing_interval_std_ms": 25.0,
            "pause_count": 0,
            "pause_duration_seconds": 0.0,
            "active_time_seconds": 15.0,
            "backspace_count": 0,
            "code_run_count": 1,
            "error_rate": 0.0,
        },
        unit="browser_telemetry_batch",
    )
    await runner.orchestrator.event_repo.add_event(live_event)

    all_session_events = await runner.orchestrator.event_repo.get_events_for_session(run.session_id)
    saved_live_event = next((e for e in all_session_events if e.id == live_event.id), None)
    assert saved_live_event is not None
    saved_live_source = saved_live_event.source_type
    assert saved_live_source == SourceType.COMPUTER_BEHAVIOR
    assert saved_live_event.source_device == "Flowstate Chrome Extension"

    # Verify they are mutually exclusive and strictly distinguishable
    assert saved_live_event.source_type != eval_events[0].source_type
    assert eval_events[0].source_type == SourceType.SIMULATED
    assert saved_live_event.source_type == SourceType.COMPUTER_BEHAVIOR

