"""API routes for Flowstate Controlled Evaluation & Evidence Layer.

Complies with Phase 4 Specification:
- Endpoints to inspect versioned scenarios.
- Endpoints to trigger reproducible deterministic evaluation runs.
- Endpoints to fetch evidence traces and non-causal scenario comparisons.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.domain.models import EvaluationRunRecord, ScenarioComparison
from backend.evaluation.engine import EvaluationRunner
from backend.evaluation.scenarios import list_scenarios, get_scenario

router = APIRouter(prefix="/evaluation", tags=["evaluation"])
eval_runner = EvaluationRunner()


class RunScenarioRequest(BaseModel):
    seed: int = 42
    participant_key: Optional[str] = None


@router.get("/scenarios", response_model=List[Dict[str, Any]])
async def get_all_scenarios():
    """List all available controlled evaluation scenarios."""
    return list_scenarios()


@router.get("/scenarios/{scenario_id}", response_model=Dict[str, Any])
async def get_scenario_definition(scenario_id: str):
    """Retrieve metadata and parameter profile for a specific controlled scenario."""
    scenario = get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    return scenario.to_dict()


@router.post("/run/{scenario_id}", response_model=EvaluationRunRecord)
async def run_evaluation_scenario(
    scenario_id: str,
    req: Optional[RunScenarioRequest] = None,
):
    """Execute a controlled behavioral evaluation scenario through the authoritative production pipeline."""
    seed = req.seed if req else 42
    participant_key = req.participant_key if req else None
    try:
        return await eval_runner.run_scenario(
            scenario_id=scenario_id,
            seed=seed,
            participant_key=participant_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation execution failed: {str(e)}")


@router.get("/runs", response_model=List[EvaluationRunRecord])
async def list_evaluation_runs(limit: int = Query(50, ge=1, le=200)):
    """List recent evaluation run records."""
    return await eval_runner.eval_repo.list_runs(limit=limit)


@router.get("/runs/{run_id}", response_model=EvaluationRunRecord)
async def get_evaluation_run(run_id: str):
    """Fetch complete evaluation run record including observations, estimates, quality gate, and evidence trace."""
    run = await eval_runner.eval_repo.get_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Evaluation run '{run_id}' not found")
    return run


@router.get("/compare/{run_id}", response_model=ScenarioComparison)
async def compare_evaluation_run(
    run_id: str,
    baseline_id: Optional[str] = Query(None, description="Optional baseline evaluation run ID to compare against"),
):
    """Generate a strictly descriptive, non-causal comparison between a run and a steady baseline."""
    try:
        return await eval_runner.compare_runs(run_id=run_id, baseline_run_id=baseline_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
