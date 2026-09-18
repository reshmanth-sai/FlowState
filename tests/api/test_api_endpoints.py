"""Automated API integration test for all Flowstate REST endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient
from backend.main import app


@pytest.mark.asyncio
async def test_full_api_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. System status check
        res = await client.get("/system/status")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "OPERATIONAL"
        assert data["hardware_boundary"]["clinical_ecg"] is False
        assert data["hardware_boundary"]["eeg_fnirs"] is False

        # 2. Create session
        res = await client.post(
            "/sessions",
            json={
                "participant_key": "api_test_reviewer",
                "task_id": "adaptive_arithmetic",
                "mode": "SIMULATED",
            },
        )
        assert res.status_code == 200
        session_data = res.json()
        session_id = session_data["id"]
        assert session_data["status"] == "CREATED"

        # 3. Start session
        res = await client.post(f"/sessions/{session_id}/start")
        assert res.status_code == 200
        assert res.json()["status"] == "RUNNING"

        # 4. Run deterministic 5-phase demo
        res = await client.post(f"/sessions/{session_id}/demo/run", json={"seed": 42, "duration_seconds": 270.0})
        assert res.status_code == 200
        demo_res = res.json()
        assert demo_res["status"] == "COMPLETED"
        assert demo_res["events_generated"] > 200
        assert demo_res["inferences_count"] >= 10

        # 5. Fetch full timeline
        res = await client.get(f"/sessions/{session_id}/timeline")
        assert res.status_code == 200
        timeline = res.json()
        assert len(timeline["windows"]) >= 10
        assert len(timeline["inferences"]) >= 10
        assert len(timeline["interventions"]) >= 1

        first_inf = timeline["inferences"][0]
        inf_id = first_inf["inference_id"]

        # 6. Test Follow-the-Signal trace
        res = await client.get(f"/inference/trace/{inf_id}")
        assert res.status_code == 200
        trace = res.json()
        assert trace["inference"]["inference_id"] == inf_id
        assert trace["features"] is not None
        assert trace["window"] is not None
        assert "Follow" in trace["trace_path"] or "State Estimate" in trace["trace_path"]

        # 7. Test interactive task definition and problem generation
        res = await client.get("/tasks/active")
        assert res.status_code == 200
        assert res.json()["name"] == "Adaptive Mental Arithmetic"

        res = await client.get("/tasks/problem?difficulty=2.0")
        assert res.status_code == 200
        prob = res.json()
        assert "prompt" in prob
        assert "expected_answer" in prob

        # 8. Submit live task telemetry
        res = await client.post(
            f"/tasks/{session_id}/telemetry",
            json={
                "question_id": prob["question_id"],
                "user_answer": prob["expected_answer"],
                "correct_answer": prob["expected_answer"],
                "response_time_ms": 520.0,
                "difficulty": 2.0,
                "retry_count": 0,
                "is_live_user": True,
            },
        )
        assert res.status_code == 200
        res_body = res.json()
        assert res_body["status"] == "INGESTED"
        assert res_body["correct"] is True
        saved_event_id = res_body["event_id"]

        # Verify task event provenance in storage
        ev_res = await client.get(f"/data/events/{session_id}?signal_type=task_event")
        assert ev_res.status_code == 200
        events_list = ev_res.json()
        assert len(events_list) > 0
        
        # Locate the specific live task event submitted by the user
        live_events = [e for e in events_list if e.get("id") == saved_event_id]
        assert len(live_events) == 1
        live_task_ev = live_events[0]
        assert live_task_ev["source_type"] == "COMPUTER_BEHAVIOR"
        assert live_task_ev["source_type"] != "REAL_WEARABLE"
        assert "Computer" in live_task_ev["source_device"]

        # 9. Test research evaluation without fabricated metrics
        res = await client.post(
            "/research/evaluate",
            json={
                "name": "Test Modality Ablation",
                "modality_configuration": "FUSED",
                "description": "Evaluate without external benchmark",
            },
        )
        assert res.status_code == 200
        exp = res.json()
        assert exp["validation_status"] == "VALIDATION_PENDING"
        assert "Scientific validation pending" in exp["metrics"]["disclaimer"]

        # 10. Record intervention feedback
        interventions = timeline["interventions"]
        if interventions:
            int_id = interventions[0]["intervention_id"]
            res = await client.post(
                f"/interventions/{int_id}/feedback",
                json={"user_action": "ACCEPTED", "user_notes": "Accepted break recommendation"},
            )
            assert res.status_code == 200
            assert res.json()["user_action"] == "ACCEPTED"
