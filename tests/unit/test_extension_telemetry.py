"""Unit tests for Browser Extension Telemetry Ingestion and Pipeline Processing."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.domain.models import SourceType, QualityGate


@pytest.mark.asyncio
async def test_extension_telemetry_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a session for browser interaction
        res = await client.post(
            "/sessions",
            json={
                "participant_key": "browser_test_user",
                "task_id": "browser_exploration",
                "mode": "SIMULATED",
                "metadata": {"origin": "chrome_extension"},
            },
        )
        assert res.status_code == 200
        session_id = res.json()["id"]

        # 2. Start session
        start_res = await client.post(f"/sessions/{session_id}/start")
        assert start_res.status_code == 200

        # 3. Submit aggregated browser telemetry batch
        batch_payload = {
            "platform": "leetcode",
            "page_title": "42. Trapping Rain Water - Hard",
            "difficulty": 4.0,
            "typing_interval_mean_ms": 780.0,
            "typing_interval_std_ms": 190.0,
            "backspace_count": 14,
            "delete_count": 2,
            "pause_count": 3,
            "pause_duration_seconds": 18.5,
            "active_time_seconds": 30.0,
            "code_run_count": 2,
            "error_rate": 0.5,
            "metadata": {"browser": "Chrome", "version": "120.0"},
        }

        telemetry_res = await client.post(
            f"/tasks/{session_id}/browser-telemetry",
            json=batch_payload,
        )
        assert telemetry_res.status_code == 200
        data = telemetry_res.json()
        assert data["status"] == "INGESTED"
        assert data["event_id"] is not None

        # 4. Verify CanonicalEvent provenance in storage
        events_res = await client.get(f"/data/events/{session_id}?signal_type=task_event")
        assert events_res.status_code == 200
        events = events_res.json()
        matching = [e for e in events if e["id"] == data["event_id"]]
        assert len(matching) == 1
        ev = matching[0]

        # Verify strict provenance
        assert ev["source_type"] == "COMPUTER_BEHAVIOR"
        assert ev["source_type"] != "REAL_WEARABLE"
        assert ev["source_type"] != "SIMULATED"
        assert ev["source_device"] == "Flowstate Chrome Extension"
        assert ev["value"]["action"] == "BROWSER_INTERACTION_BATCH"
        assert ev["value"]["platform"] == "leetcode"
        assert ev["value"]["difficulty"] == 4.0
        assert ev["value"]["typing_interval_mean_ms"] == 780.0


@pytest.mark.asyncio
async def test_extension_structured_context_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create session
        res = await client.post(
            "/sessions",
            json={
                "participant_key": "context_user",
                "task_id": "browser_context_eval",
                "mode": "SIMULATED",
            },
        )
        assert res.status_code == 200
        session_id = res.json()["id"]

        await client.post(f"/sessions/{session_id}/start")

        structured_payload = {
            "source_type": "COMPUTER_BEHAVIOR",
            "behavior": {
                "typing_interval_mean_ms": 240.0,
                "typing_interval_std_ms": 85.0,
                "backspace_count": 9,
                "delete_count": 1,
                "pause_count": 3,
                "pause_duration_seconds": 31.0,
                "active_time_seconds": 120.0,
                "code_run_count": 4,
                "error_rate": 0.5,
            },
            "context": {
                "context_schema_version": "1.0.0",
                "platform": "leetcode",
                "task": {
                    "type": "coding_problem",
                    "difficulty": "hard",
                    "difficulty_scalar": 4.0,
                    "title": "15. 3Sum",
                    "language": "python3",
                },
                "activity": {
                    "active_time_seconds": 120.0,
                    "submission_count": 3,
                    "code_run_count": 4,
                    "failure_count": 2,
                    "last_outcome": "WRONG_ANSWER",
                },
            },
            # Flat legacy compatibility fields
            "platform": "leetcode",
            "page_title": "15. 3Sum - LeetCode",
            "difficulty": 4.0,
            "typing_interval_mean_ms": 240.0,
            "typing_interval_std_ms": 85.0,
            "backspace_count": 9,
            "delete_count": 1,
            "pause_count": 3,
            "pause_duration_seconds": 31.0,
            "active_time_seconds": 120.0,
            "code_run_count": 4,
            "error_rate": 0.5,
        }

        telemetry_res = await client.post(
            f"/tasks/{session_id}/browser-telemetry",
            json=structured_payload,
        )
        assert telemetry_res.status_code == 200
        data = telemetry_res.json()
        assert data["status"] == "INGESTED"

        # Verify event storage and context preservation
        events_res = await client.get(f"/data/events/{session_id}?signal_type=task_event")
        assert events_res.status_code == 200
        events = events_res.json()
        matching = [e for e in events if e["id"] == data["event_id"]]
        assert len(matching) == 1
        ev = matching[0]

        assert ev["source_type"] == "COMPUTER_BEHAVIOR"
        assert ev["source_type"] != "REAL_WEARABLE"
        assert ev["value"]["context"]["context_schema_version"] == "1.0.0"
        assert ev["value"]["context"]["task"]["difficulty_scalar"] == 4.0
        assert ev["value"]["context"]["task"]["title"] == "15. 3Sum"
        assert ev["value"]["context"]["activity"]["last_outcome"] == "WRONG_ANSWER"
        assert ev["value"]["behavior"]["typing_interval_mean_ms"] == 240.0


@pytest.mark.asyncio
async def test_extension_colab_and_mouse_telemetry():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a session for Colab research workflow
        res = await client.post(
            "/sessions",
            json={
                "participant_key": "colab_researcher",
                "task_id": "transformer_experiment",
                "mode": "SIMULATED",
                "metadata": {"origin": "chrome_extension", "platform": "colab"},
            },
        )
        assert res.status_code == 200
        session_id = res.json()["id"]

        start_res = await client.post(f"/sessions/{session_id}/start")
        assert start_res.status_code == 200

        # 2. Submit Colab batch with mouse kinematics and zero-knowledge behavioral aggregates
        colab_payload = {
            "platform": "colab",
            "page_title": "NLP_Transformer_Finetune.ipynb",
            "difficulty": 2.0,
            "typing_interval_mean_ms": 310.0,
            "typing_interval_std_ms": 72.0,
            "backspace_count": 5,
            "delete_count": 0,
            "pause_count": 2,
            "pause_duration_seconds": 12.0,
            "active_time_seconds": 30.0,
            "code_run_count": 3,
            "error_rate": 0.0,
            "behavior": {
                "typing_interval_mean_ms": 310.0,
                "typing_interval_std_ms": 72.0,
                "backspace_count": 5,
                "delete_count": 0,
                "pause_count": 2,
                "pause_duration_seconds": 12.0,
                "active_time_seconds": 30.0,
                "code_run_count": 3,
                "error_rate": 0.0,
                "cursor_reversals": 6,
                "cursor_speed_mean": 295.4,
                "cursor_speed_std": 82.1,
            },
            "context": {
                "context_schema_version": "1.0.0",
                "platform": "colab",
                "task": {
                    "type": "notebook_computation",
                    "difficulty": "Interactive",
                    "difficulty_scalar": 2.0,
                    "title": "NLP_Transformer_Finetune.ipynb",
                    "language": "Python",
                },
                "activity": {
                    "active_time_seconds": 30.0,
                    "submission_count": 0,
                    "code_run_count": 3,
                    "failure_count": 0,
                    "last_outcome": "EXECUTED",
                },
            },
            "metadata": {
                "adapter": "ColabContextAdapter",
                "cursor_reversals": 6,
                "cursor_speed_mean": 295.4,
                "cursor_speed_std": 82.1,
            },
        }

        telemetry_res = await client.post(
            f"/tasks/{session_id}/browser-telemetry",
            json=colab_payload,
        )
        assert telemetry_res.status_code == 200
        data = telemetry_res.json()
        assert data["status"] == "INGESTED"

        # 3. Verify event storage and mouse kinematics persistence
        events_res = await client.get(f"/data/events/{session_id}?signal_type=task_event")
        assert events_res.status_code == 200
        events = events_res.json()
        matching = [e for e in events if e["id"] == data["event_id"]]
        assert len(matching) == 1
        ev = matching[0]

        assert ev["source_type"] == "COMPUTER_BEHAVIOR"
        assert ev["value"]["platform"] == "colab"
        assert ev["value"]["context"]["task"]["title"] == "NLP_Transformer_Finetune.ipynb"
        assert ev["value"]["behavior"]["cursor_reversals"] == 6
        assert ev["value"]["behavior"]["cursor_speed_mean"] == 295.4
        assert ev["value"]["behavior"]["code_run_count"] == 3

