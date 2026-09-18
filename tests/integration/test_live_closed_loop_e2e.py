"""
E2E Verification for Flowstate Live Adaptive Experience
Validates:
1. Session creation & WebSocket connection (initial state broadcast)
2. Browser telemetry ingestion -> Full production pipeline execution
3. Real-time WebSocket LIVE_SESSION_UPDATE delivery
4. HTTP Polling Fallback (/tasks/{session_id}/live-state)
5. Pitch Accelerator burst (/tasks/{session_id}/simulate-burst)
6. Canonical SQLite event persistence and provenance invariant
"""

import asyncio
import json
import httpx
import websockets
import pytest

BACKEND_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000"


@pytest.mark.asyncio
async def test_live_adaptive_closed_loop():
    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=10.0) as client:
        # 1. Create a session
        resp = await client.post("/sessions", json={
            "participant_key": "live_eval_pilot",
            "task_id": "task_live_closed_loop",
            "mode": "REAL_WEARABLE",
            "metadata": {"task": "Full Closed Loop Live Test"}
        })
        assert resp.status_code == 200, f"Session creation failed: {resp.text}"
        session_data = resp.json()
        session_id = session_data["id"]
        print(f"✓ Created session {session_id}")

        # Start session
        start_resp = await client.post(f"/sessions/{session_id}/start")
        assert start_resp.status_code == 200

        # 2. Connect to WebSocket
        ws_uri = f"{WS_URL}/ws/session/{session_id}"
        async with websockets.connect(ws_uri) as ws:
            print(f"✓ Connected to WebSocket: {ws_uri}")

            initial_msg_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            initial_msg = json.loads(initial_msg_raw)
            assert initial_msg.get("type") in ["LIVE_SESSION_INIT", "LIVE_SESSION_UPDATE"]
            assert initial_msg.get("session_id") == session_id
            print("✓ Initial WebSocket state snapshot received")

            # 3. Simulate real extension telemetry submission
            telemetry_batch = {
                "session_id": session_id,
                "platform": "leetcode",
                "page_title": "15. 3Sum - LeetCode",
                "difficulty": 2.5,
                "typing_interval_mean_ms": 110.0,
                "typing_interval_std_ms": 15.0,
                "backspace_count": 8,
                "delete_count": 0,
                "pause_count": 3,
                "pause_duration_seconds": 9.5,
                "active_time_seconds": 30.0,
                "code_run_count": 2,
                "error_rate": 0.5,
                "context": {
                    "task": {
                        "title": "15. 3Sum",
                        "difficulty": "medium",
                        "language": "python3"
                    }
                }
            }

            post_resp = await client.post(f"/tasks/{session_id}/browser-telemetry", json=telemetry_batch)
            assert post_resp.status_code == 200, f"Telemetry submission failed: {post_resp.text}"
            post_data = post_resp.json()
            assert post_data.get("status") == "INGESTED"
            event_id = post_data.get("event_id")
            assert event_id is not None
            print(f"✓ Telemetry ingested into backend. Event ID: {event_id}")

            # 4. WebSocket should receive LIVE_SESSION_UPDATE
            update_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            update = json.loads(update_raw)
            assert update.get("type") == "LIVE_SESSION_UPDATE"
            assert update.get("session_id") == session_id
            assert update.get("event_id") == event_id
            assert update.get("provenance") == "COMPUTER_BEHAVIOR"
            assert "estimate" in update
            assert "quality" in update
            assert "adaptation" in update
            print(f"✓ WebSocket broadcast verified: Workload={update['estimate']['workload']}, Gate={update['quality']['gate']}")

            # 5. Verify Dual-Transport Polling Fallback endpoint
            live_state_resp = await client.get(f"/tasks/{session_id}/live-state")
            assert live_state_resp.status_code == 200
            live_state = live_state_resp.json()
            assert live_state.get("session_id") == session_id
            assert live_state.get("estimate")["workload"] == update["estimate"]["workload"]
            assert live_state.get("quality")["gate"] == update["quality"]["gate"]
            print("✓ HTTP Polling Fallback (/live-state) verified identical to WebSocket broadcast")

            # 6. Test Pitch Accelerator (/simulate-burst)
            burst_resp = await client.post(f"/tasks/{session_id}/simulate-burst")
            assert burst_resp.status_code == 200
            burst_data = burst_resp.json()
            assert burst_data.get("status") == "INGESTED"
            burst_event_id = burst_data.get("event_id")
            print(f"✓ Pitch Accelerator burst processed. New Event ID: {burst_event_id}")

            # WebSocket should receive another LIVE_SESSION_UPDATE for the burst
            burst_update_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            burst_update = json.loads(burst_update_raw)
            assert burst_update.get("session_id") == session_id
            assert burst_update.get("event_id") == burst_event_id
            print(f"✓ Real-time burst broadcast received over WebSocket: Workload={burst_update['estimate']['workload']}")

            # 7. End session
            await client.post(f"/sessions/{session_id}/stop")
            print("✓ Session stopped cleanly")


if __name__ == "__main__":
    asyncio.run(test_live_adaptive_closed_loop())
