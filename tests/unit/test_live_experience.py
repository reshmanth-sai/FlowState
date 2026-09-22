"""Unit and integration tests for Flowstate Live Adaptive Experience.

Verifies:
1. Live state endpoint serialization and COMPUTER_BEHAVIOR provenance
2. WebSocket connection management and broadcast delivery
3. Session boundary isolation (session A messages never bleed into session B)
4. Live Pitch Accelerator (simulate-burst) execution through production pipeline
5. Epistemic quality and adaptation decision reflection in live payloads
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.api.websocket_manager import ws_manager
from backend.domain.models import SourceType, SessionMode
from backend.sessions.orchestrator import SessionOrchestrator


@pytest_asyncio.fixture
async def live_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def active_live_session():
    orchestrator = SessionOrchestrator()
    session = await orchestrator.create_session(
        participant_key="test_live_pilot_user",
        mode=SessionMode.SIMULATED,
    )
    started = await orchestrator.start_session(session.id)
    return started


@pytest.mark.asyncio
async def test_live_state_endpoint(live_client: AsyncClient, active_live_session):
    """Verify GET /tasks/{session_id}/live-state returns authoritative provenance and schema."""
    sid = active_live_session.id
    resp = await live_client.get(f"/tasks/{sid}/live-state")
    assert resp.status_code == 200
    data = resp.json()

    assert data["session_id"] == sid
    assert data["session_status"] == "RUNNING"
    assert data["provenance"] == "COMPUTER_BEHAVIOR"
    assert "timestamp" in data
    assert "windows_count" in data


@pytest.mark.asyncio
async def test_simulate_burst_runs_production_pipeline(live_client: AsyncClient, active_live_session):
    """Verify Live Pitch Accelerator creates real COMPUTER_BEHAVIOR event through pipeline."""
    sid = active_live_session.id
    resp = await live_client.post(f"/tasks/{sid}/simulate-burst?elevated=false")
    assert resp.status_code == 200
    result = resp.json()

    assert result["status"] == "INGESTED"
    assert result["event_id"].startswith("evt_ext_")
    assert "live_state" in result

    live_state = result["live_state"]
    assert live_state["session_id"] == sid
    assert live_state["provenance"] == "COMPUTER_BEHAVIOR"
    assert live_state["context"]["platform"] in ("SIMULATED CONTEXT", "leetcode")
    assert live_state["context"]["task"] in (active_live_session.task_id, "adaptive_arithmetic")
    assert "estimate" in live_state
    assert "quality" in live_state
    assert "adaptation" in live_state


@pytest.mark.asyncio
async def test_session_boundary_isolation():
    """Verify messages sent to session A are never delivered to session B."""
    class MockWebSocket:
        def __init__(self):
            self.messages = []
            self.accepted = False

        async def accept(self):
            self.accepted = True

        async def send_json(self, msg):
            self.messages.append(msg)

    ws_a = MockWebSocket()
    ws_b = MockWebSocket()

    await ws_manager.connect("session_alpha", ws_a)
    await ws_manager.connect("session_beta", ws_b)

    payload_a = {"session_id": "session_alpha", "msg": "hello_alpha"}
    payload_b = {"session_id": "session_beta", "msg": "hello_beta"}

    await ws_manager.broadcast_to_session("session_alpha", payload_a)

    assert len(ws_a.messages) == 1
    assert ws_a.messages[0]["msg"] == "hello_alpha"
    # Session B must receive ZERO messages from Session A
    assert len(ws_b.messages) == 0

    await ws_manager.broadcast_to_session("session_beta", payload_b)
    assert len(ws_b.messages) == 1
    assert ws_b.messages[0]["msg"] == "hello_beta"

    # Clean up
    ws_manager.disconnect("session_alpha", ws_a)
    ws_manager.disconnect("session_beta", ws_b)


@pytest.mark.asyncio
async def test_adaptation_cooldown_in_live_state(live_client: AsyncClient, active_live_session):
    """Verify live state payload reflects 120s cooldown and uninvented adaptation rules."""
    sid = active_live_session.id
    resp = await live_client.post(f"/tasks/{sid}/simulate-burst?elevated=true")
    assert resp.status_code == 200
    data = resp.json()["live_state"]

    adaptation = data["adaptation"]
    assert "cooldown_seconds" in adaptation
    assert adaptation["cooldown_seconds"] == 120
    assert "action" in adaptation
    assert "status" in adaptation
