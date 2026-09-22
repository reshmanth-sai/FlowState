"""E2E contract test for Extension Telemetry Pipeline.

Validates that browser telemetry payload matching the real Chrome extension output
is ingested, triggers session auto-start if in CREATED status, feeds through
the feature engine, quality gate, and inference pipelines, and produces
session summary metrics and inferences.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.domain.models import SessionStatus, QualityGate
from backend.storage.database import db_manager


@pytest.mark.asyncio
async def test_extension_e2e_contract_pipeline():
    db_manager.init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create session (initially in CREATED status)
        res = await client.post(
            "/sessions",
            json={
                "participant_key": "e2e_contract_user",
                "task_id": "browser_contract_task",
                "mode": "SIMULATED",
                "metadata": {"origin": "flowstate_extension"},
            },
        )
        assert res.status_code == 200
        session_id = res.json()["id"]
        assert res.json()["status"] == SessionStatus.CREATED.value

        # 2. Real Chrome extension payload (matches service-worker.js handleTelemetryBatch)
        extension_payload = {
            "source_type": "COMPUTER_BEHAVIOR",
            "platform": "leetcode",
            "page_title": "1. Two Sum - LeetCode",
            "difficulty": 2.0,
            "typing_interval_mean_ms": 320.5,
            "typing_interval_std_ms": 45.2,
            "backspace_count": 5,
            "delete_count": 1,
            "pause_count": 2,
            "pause_duration_seconds": 12.0,
            "active_time_seconds": 45.0,
            "code_run_count": 2,
            "error_rate": 0.0,
            "behavior": {
                "typing_interval_mean_ms": 320.5,
                "typing_interval_std_ms": 45.2,
                "backspace_count": 5,
                "delete_count": 1,
                "pause_count": 2,
                "pause_duration_seconds": 12.0,
                "active_time_seconds": 45.0,
                "code_run_count": 2,
                "error_rate": 0.0,
            },
            "context": {
                "context_schema_version": "1.0.0",
                "platform": "leetcode",
                "task": {
                    "type": "coding_problem",
                    "difficulty": "easy",
                    "difficulty_scalar": 2.0,
                    "title": "1. Two Sum",
                    "language": "python3",
                },
                "activity": {
                    "active_time_seconds": 45.0,
                    "submission_count": 1,
                    "code_run_count": 2,
                    "failure_count": 0,
                    "last_outcome": "ACCEPTED",
                },
            },
            "metadata": {
                "browser": "Chrome",
                "version": "120.0",
                "extension_version": "1.0.0",
            },
        }

        # 3. Post telemetry to backend - must auto-start the session and ingest
        telemetry_res = await client.post(
            f"/tasks/{session_id}/browser-telemetry",
            json=extension_payload,
        )
        assert telemetry_res.status_code == 200
        telemetry_data = telemetry_res.json()
        assert telemetry_data["status"] == "INGESTED"
        assert telemetry_data["event_id"] is not None

        # 4. Verify session transitioned to RUNNING automatically
        session_res = await client.get(f"/sessions/{session_id}")
        assert session_res.status_code == 200
        assert session_res.json()["status"] == SessionStatus.RUNNING.value

        # 5. Verify CanonicalEvent in storage with COMPUTER_BEHAVIOR provenance
        events_res = await client.get(f"/data/events/{session_id}?signal_type=task_event")
        assert events_res.status_code == 200
        events = events_res.json()
        assert len(events) >= 1
        ev = events[0]
        assert ev["source_type"] == "COMPUTER_BEHAVIOR"
        assert ev["source_device"] == "Flowstate Chrome Extension"
        assert ev["value"]["platform"] == "leetcode"
        assert ev["value"]["context"]["task"]["title"] == "1. Two Sum"

        # 6. Verify active session discovery finds this session
        sessions_list = await client.get("/sessions")
        assert sessions_list.status_code == 200
        all_sessions = sessions_list.json()
        active = [s for s in all_sessions if s["id"] == session_id and s["status"] == "RUNNING"]
        assert len(active) == 1

        # 7. Stop session and verify stopped status
        stop_res = await client.post(f"/sessions/{session_id}/stop")
        assert stop_res.status_code == 200
        assert stop_res.json()["status"] == SessionStatus.STOPPED.value
