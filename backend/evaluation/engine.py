"""Controlled Evaluation Engine for Flowstate Phase 4.

Complies with Phase 4 Specification:
- Executes deterministic evaluation scenarios through the existing production pipeline:
  SCENARIO -> BEHAVIOR -> CANONICAL_EVENTS -> SLIDING_WINDOWS -> FEATURES -> INFERENCE -> QUALITY_GATE -> ADAPTATION -> EVIDENCE_TRACE
- Zero duplicate inference logic or secondary formulas.
- Option A: Behavioral-only evaluation (COMPUTER_BEHAVIOR).
- Descriptive, non-causal scenario-to-baseline comparison.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from backend.domain.models import (
    AdaptationDecision,
    CanonicalEvent,
    EvaluationRunRecord,
    FeatureVector,
    InferenceOutput,
    QualityGate,
    ScenarioComparison,
    SessionMode,
    SessionStatus,
    SignalWindow,
)
from backend.domain.repositories import EvaluationRepository
from backend.evaluation.scenarios import (
    ControlledScenario,
    generate_scenario_events,
    get_scenario,
    list_scenarios,
)
from backend.sessions.orchestrator import SessionOrchestrator
from backend.storage.sqlite_repo import SQLiteEvaluationRepository


class EvaluationRunner:
    def __init__(
        self,
        orchestrator: Optional[SessionOrchestrator] = None,
        eval_repo: Optional[EvaluationRepository] = None,
    ):
        self.orchestrator = orchestrator or SessionOrchestrator()
        self.eval_repo = eval_repo or SQLiteEvaluationRepository()

    async def run_scenario(
        self,
        scenario_id: str,
        seed: int = 42,
        participant_key: Optional[str] = None,
    ) -> EvaluationRunRecord:
        """Run a controlled evaluation scenario through the authoritative production pipeline."""
        scenario = get_scenario(scenario_id)
        if not scenario:
            raise ValueError(f"Evaluation scenario '{scenario_id}' not found")

        # 1. Create research evaluation session
        p_key = participant_key or f"eval_participant_{scenario_id}"
        session = await self.orchestrator.create_session(
            participant_key=p_key,
            task_id="controlled_evaluation",
            mode=SessionMode.SIMULATED,
            metadata={
                "scenario_id": scenario.scenario_id,
                "scenario_version": scenario.scenario_version,
                "evaluation_run": True,
                "seed": seed,
            },
        )

        # 2. Timing calibration: For time-on-task scenarios, align started_at
        now = datetime.now(timezone.utc)
        if scenario.scenario_id == "sustained_duration":
            start_time = now - timedelta(seconds=scenario.duration_seconds)
            completed_time = now
        else:
            start_time = now - timedelta(seconds=min(scenario.duration_seconds, 60.0))
            completed_time = now

        session.started_at = start_time
        session.status = SessionStatus.RUNNING
        await self.orchestrator.session_repo.update(session)

        # 3. Generate deterministic canonical events reflecting the controlled scenario
        events = generate_scenario_events(
            scenario=scenario,
            session_id=session.id,
            start_time=start_time,
            seed=seed,
        )

        # 4. Ingest events into persistent storage and orchestrator buffer
        await self.orchestrator.ingestion_service.ingest_batch(events)

        # 5. Sliding window generation
        # Ensure the evaluation window spans the scenario duration so time_on_task is fully represented
        win_start = start_time
        win_end = start_time + timedelta(seconds=scenario.duration_seconds)

        win_model = SignalWindow(
            window_id=f"win_eval_{session.id}_{seed}",
            session_id=session.id,
            start_time=win_start,
            end_time=win_end,
            duration_seconds=(win_end - win_start).total_seconds(),
            completeness=1.0,
            quality_summary={"task_behaviour": 1.0},
            event_counts={"task_event": len(events)},
        )
        saved_win = await self.orchestrator.window_repo.save_window(win_model)

        # 6. Authoritative Feature Extraction via FeatureEngine
        fv = self.orchestrator.feature_engine.compute_features(
            window=saved_win,
            events=events,
            participant_key=session.participant_key,
            session_start_time=start_time,
        )
        saved_fv = await self.orchestrator.feature_repo.save_features(fv)

        # 7. Authoritative Inference & Confidence Gating via InferenceEngine
        inf = self.orchestrator.inference_engine.run_inference(saved_fv)
        saved_inf = await self.orchestrator.inference_repo.save_inference(inf)

        # 8. Authoritative Adaptation Policy Evaluation via AdaptationEngine
        decision = await self.orchestrator.adaptation_engine.evaluate_and_record(saved_inf)

        # 9. Format structured observations, estimates, and quality
        profile = scenario.telemetry_profile
        observations = {
            "typing_interval_mean_ms": profile.get("typing_interval_mean_ms", 0.0),
            "typing_interval_std_ms": profile.get("typing_interval_std_ms", 0.0),
            "pause_count": profile.get("pause_count", 0),
            "pause_duration_total_seconds": profile.get("pause_duration_seconds", 0.0),
            "error_rate": profile.get("error_rate", 0.0),
            "backspace_count": profile.get("backspace_count", 0),
            "delete_count": profile.get("delete_count", 0),
            "active_time_seconds": profile.get("active_time_seconds", 0.0),
            "completion_count": profile.get("code_run_count", 0),
            "time_on_task_seconds": saved_fv.features.get("time_on_task_seconds", 0.0),
        }

        estimates = {
            "workload": saved_inf.workload.model_dump(),
            "fatigue": saved_inf.fatigue.model_dump(),
            "engagement": saved_inf.engagement.model_dump(),
        }

        modalities = [k for k, v in saved_fv.availability_mask.items() if v]

        quality = {
            "gate": saved_inf.quality_gate.value,
            "confidence": saved_inf.workload.confidence,
            "modalities": modalities,
        }

        adaptation = {
            "action": decision.action.value if decision else "NO_ACTION",
            "triggered": decision is not None and decision.action.value != "NO_ACTION",
            "reason": decision.reason if decision else "No adaptation triggered (observed state within nominal bounds or confidence below intervention threshold)",
            "cooldown_seconds": decision.cooldown_seconds if decision else 120,
        }

        context = {
            "platform": scenario.target_context.get("platform", "leetcode"),
            "task_id": scenario.target_context.get("task_id", "two-sum"),
            "difficulty_label": scenario.target_context.get("difficulty_label", "Easy"),
            "difficulty_scalar": scenario.target_context.get("difficulty", 1.0),
            "environmental_metadata_only": True,
        }

        reproducibility = {
            "evaluation_schema_version": "1.0.0",
            "scenario_version": scenario.scenario_version,
            "context_schema_version": "1.0.0",
            "feature_version": saved_fv.feature_version,
            "model_version": saved_inf.model_version,
            "seed": seed,
            "provenance": "SIMULATED",
        }

        run_record = EvaluationRunRecord(
            evaluation_run_id=f"eval_run_{uuid.uuid4().hex[:12]}",
            scenario_id=scenario.scenario_id,
            scenario_version=scenario.scenario_version,
            session_id=session.id,
            started_at=start_time,
            completed_at=completed_time,
            feature_version=saved_fv.feature_version,
            model_version=saved_inf.model_version,
            context_schema_version="1.0.0",
            evaluation_schema_version="1.0.0",
            observations=observations,
            estimates=estimates,
            quality=quality,
            adaptation=adaptation,
            context=context,
            evidence=saved_inf.evidence,
            reproducibility=reproducibility,
            created_at=datetime.now(timezone.utc),
        )

        # 10. Persist to evaluation repository
        return await self.eval_repo.save_evaluation_run(run_record)

    async def compare_runs(
        self,
        run_id: str,
        baseline_run_id: Optional[str] = None,
    ) -> ScenarioComparison:
        """Compute a strictly descriptive, non-causal comparison between a run and a baseline run."""
        run = await self.eval_repo.get_by_id(run_id)
        if not run:
            raise ValueError(f"Evaluation run '{run_id}' not found")

        baseline: Optional[EvaluationRunRecord] = None
        if baseline_run_id:
            baseline = await self.eval_repo.get_by_id(baseline_run_id)
        else:
            baseline = await self.eval_repo.get_latest_for_scenario("steady_baseline")

        if not baseline:
            # If no baseline run exists yet, generate one on-the-fly deterministically
            baseline = await self.run_scenario("steady_baseline", seed=42)

        # Calculate observations delta
        obs_delta: Dict[str, Any] = {}
        for k, v in run.observations.items():
            b_val = baseline.observations.get(k, 0.0)
            if isinstance(v, (int, float)) and isinstance(b_val, (int, float)):
                obs_delta[k] = round(v - b_val, 2)

        # Calculate estimates delta
        est_delta: Dict[str, Any] = {}
        for state in ["workload", "fatigue", "engagement"]:
            run_val = run.estimates.get(state, {}).get("value", 0.0)
            base_val = baseline.estimates.get(state, {}).get("value", 0.0)
            est_delta[state] = round(run_val - base_val, 2)

        quality_transition = {
            "baseline_gate": baseline.quality.get("gate", "DEGRADED"),
            "scenario_gate": run.quality.get("gate", "DEGRADED"),
            "baseline_confidence": baseline.quality.get("confidence", 0.0),
            "scenario_confidence": run.quality.get("confidence", 0.0),
        }

        adaptation_summary = {
            "baseline_action": baseline.adaptation.get("action", "NO_ACTION"),
            "scenario_action": run.adaptation.get("action", "NO_ACTION"),
            "scenario_triggered": run.adaptation.get("triggered", False),
            "scenario_reason": run.adaptation.get("reason", ""),
        }

        # Formulate non-causal descriptive narrative
        narrative_parts = []
        if run.scenario_id == "pause_heavy":
            pause_diff = obs_delta.get("pause_duration_total_seconds", 0.0)
            fatigue_diff = est_delta.get("fatigue", 0.0)
            base_f = baseline.estimates.get("fatigue", {}).get("value", 0.0)
            run_f = run.estimates.get("fatigue", {}).get("value", 0.0)
            narrative_parts.append(
                f"During the pause-heavy scenario, estimated fatigue changed from {base_f:.2f} to {run_f:.2f} "
                f"({fatigue_diff:+.2f}) alongside the observed increase in pause duration ({pause_diff:+.1f}s). "
                f"Evidence quality gate remained {quality_transition['baseline_gate']} → {quality_transition['scenario_gate']}."
            )
        elif run.scenario_id == "error_heavy":
            err_diff = obs_delta.get("error_rate", 0.0)
            wl_diff = est_delta.get("workload", 0.0)
            base_wl = baseline.estimates.get("workload", {}).get("value", 0.0)
            run_wl = run.estimates.get("workload", {}).get("value", 0.0)
            narrative_parts.append(
                f"During the error-heavy scenario, estimated workload changed from {base_wl:.2f} to {run_wl:.2f} "
                f"({wl_diff:+.2f}) alongside the observed increase in error rate ({err_diff:+.2f}). "
                f"Evidence quality gate remained {quality_transition['baseline_gate']} → {quality_transition['scenario_gate']}."
            )
        elif run.scenario_id == "reduced_activity":
            eng_diff = est_delta.get("engagement", 0.0)
            base_eng = baseline.estimates.get("engagement", {}).get("value", 0.0)
            run_eng = run.estimates.get("engagement", {}).get("value", 0.0)
            narrative_parts.append(
                f"During the reduced-activity scenario, estimated engagement changed from {base_eng:.2f} to {run_eng:.2f} "
                f"({eng_diff:+.2f}) alongside the observed reduction in interaction throughput and elongated typing intervals. "
                f"Evidence quality gate remained {quality_transition['baseline_gate']} → {quality_transition['scenario_gate']}."
            )
        elif run.scenario_id == "sustained_duration":
            tot_diff = obs_delta.get("time_on_task_seconds", 0.0)
            fatigue_diff = est_delta.get("fatigue", 0.0)
            base_f = baseline.estimates.get("fatigue", {}).get("value", 0.0)
            run_f = run.estimates.get("fatigue", {}).get("value", 0.0)
            narrative_parts.append(
                f"During the sustained-duration scenario, estimated fatigue changed from {base_f:.2f} to {run_f:.2f} "
                f"({fatigue_diff:+.2f}) alongside the extended elapsed session duration ({tot_diff:+.1f}s time-on-task). "
                f"Evidence quality gate remained {quality_transition['baseline_gate']} → {quality_transition['scenario_gate']}."
            )
        else:
            narrative_parts.append(
                f"During the {run.scenario_id} scenario, observed behavioral parameters and model estimates remained "
                f"within nominal reference bounds. Evidence quality gate was {quality_transition['scenario_gate']}."
            )

        descriptive_narrative = " ".join(narrative_parts)

        return ScenarioComparison(
            comparison_id=f"comp_{uuid.uuid4().hex[:10]}",
            evaluation_run_id=run.evaluation_run_id,
            baseline_run_id=baseline.evaluation_run_id,
            scenario_id=run.scenario_id,
            observations_delta=obs_delta,
            estimates_delta=est_delta,
            quality_transition=quality_transition,
            adaptation_summary=adaptation_summary,
            descriptive_narrative=descriptive_narrative,
            created_at=datetime.now(timezone.utc),
        )
