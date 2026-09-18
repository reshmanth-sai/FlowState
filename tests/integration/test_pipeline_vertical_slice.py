"""Integration test for Flowstate's complete vertical slice.

Verifies:
Provider -> Ingestion -> Quality -> Synchronization -> Windowing ->
Features -> Personalization -> Fusion -> Inference -> Confidence Gate ->
Explanation -> Adaptation -> Feedback -> Review
"""

import pytest
from backend.domain.models import InterventionStatus, SessionMode, SessionStatus
from backend.sessions.orchestrator import SessionOrchestrator
from backend.storage.database import db_manager


@pytest.mark.asyncio
async def test_complete_vertical_slice():
    # 1. Initialize clean DB schema
    db_manager.init_db()
    orchestrator = SessionOrchestrator()

    # 2. Create and start a simulated research session
    session = await orchestrator.create_session(
        participant_key="participant_alpha_test",
        task_id="adaptive_arithmetic",
        mode=SessionMode.SIMULATED,
        metadata={"study": "validation_study_1"},
    )
    assert session.id is not None
    assert session.status == SessionStatus.CREATED

    started_session = await orchestrator.start_session(session.id)
    assert started_session is not None
    assert started_session.status == SessionStatus.RUNNING

    # 3. Run the deterministic 5-phase scenario (seed=42)
    result = await orchestrator.run_deterministic_scenario(
        session_id=session.id,
        seed=42,
        duration_seconds=270.0,
    )

    assert result["status"] == "COMPLETED"
    assert result["events_generated"] > 250
    assert result["windows_count"] >= 10
    assert result["features_count"] >= 10
    assert result["inferences_count"] >= 10
    assert result["interventions_count"] >= 1

    # 4. Inspect session summary
    summary = await orchestrator.get_session_summary(session.id)
    assert len(summary["windows"]) >= 10
    assert len(summary["inferences"]) >= 10

    first_inf = summary["inferences"][0]
    assert "workload" in first_inf
    assert "fatigue" in first_inf
    assert "engagement" in first_inf
    assert "quality_gate" in first_inf
    assert "evidence" in first_inf
    assert len(first_inf["evidence"]) > 0

    # 5. Verify adaptation intervention and record user feedback
    interventions = summary["interventions"]
    assert len(interventions) >= 1
    target_int = interventions[0]
    assert target_int["action"] in ["SUGGEST_SHORT_BREAK", "REDUCE_DIFFICULTY", "ATTENTION_PROMPT"]

    feedback = await orchestrator.feedback_engine.record_response(
        intervention_id=target_int["intervention_id"],
        user_action=InterventionStatus.ACCEPTED,
        user_notes="Accepted 60-second recovery pause.",
    )
    assert feedback is not None
    assert feedback.user_action == InterventionStatus.ACCEPTED

    # 6. Stop session
    stopped = await orchestrator.stop_session(session.id)
    assert stopped is not None
    assert stopped.status == SessionStatus.STOPPED
    print("\n[PASS] End-to-End Vertical Slice successfully verified!")
