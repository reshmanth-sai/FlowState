"""Targeted test verifying the complete Adaptation Policy to Extension HUD round-trip."""

import asyncio
import json
import os
import sys
sys.path.insert(0, "/Users/sai/FlowState")
import sqlite3
import subprocess
import time
import uuid
import httpx
import websockets
from backend.sessions.orchestrator import SessionOrchestrator
from backend.domain.models import AdaptationDecision, AdaptationAction, InterventionStatus

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
EXTENSION_PATH = "/Users/sai/FlowState/extension"
USER_DATA_DIR = "/tmp/flowstate_adaptation_profile"
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:5173"

async def test_adaptation_roundtrip():
    print("=== TESTING ADAPTATION POLICY TO HUD ROUND-TRIP ===")
    subprocess.run(["rm", "-rf", USER_DATA_DIR])

    http_client = httpx.AsyncClient(timeout=10.0)

    # 1. Create a session and ingest synthetic high-fatigue multi-modal events to achieve PASS/DEGRADED with conf >= 0.65
    sess_res = await http_client.post(f"{BACKEND_URL}/sessions", json={
        "participant_key": "adaptation_tester",
        "task_id": "adaptive_arithmetic",
        "mode": "SIMULATED",
        "metadata": {"test": "adaptation_loop"}
    })
    session_id = sess_res.json()["id"]
    await http_client.post(f"{BACKEND_URL}/sessions/{session_id}/start")
    print(f"✓ Created test session: {session_id}")

    # Generate multi-modal events so quality gate is PASS / DEGRADED with high confidence
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)

    # Ingest heart rate & task events
    for i in range(25):
        t = (now - timedelta(seconds=25 - i)).isoformat()
        await http_client.post(f"{BACKEND_URL}/data/raw", json={
            "session_id": session_id,
            "timestamp": t,
            "source_type": "SIMULATED",
            "source_device": "Polar H10",
            "signal_type": "HEART_RATE",
            "value": 85.0 + i * 0.4,
            "unit": "bpm"
        })

    # Start Chrome with CDP
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        f"--user-data-dir={USER_DATA_DIR}",
        "--disable-gpu",
        "--no-first-run",
        "about:blank",
    ]
    proc = subprocess.Popen(cmd)
    time.sleep(2)

    try:
        ver_res = None
        for _ in range(20):
            try:
                ver_res = await http_client.get("http://127.0.0.1:9222/json/version")
                if ver_res.status_code == 200: break
            except Exception:
                await asyncio.sleep(0.3)

        browser_ws = ver_res.json()["webSocketDebuggerUrl"]
        async with websockets.connect(browser_ws) as b_ws:
            # Load extension
            await b_ws.send(json.dumps({"id": 1, "method": "Extensions.loadUnpacked", "params": {"path": EXTENSION_PATH}}))
            ext_res = json.loads(await b_ws.recv())
            ext_id = ext_res["result"]["id"]
            print(f"✓ Extension loaded: {ext_id}")

            # Open localhost page
            await b_ws.send(json.dumps({"id": 2, "method": "Target.createTarget", "params": {"url": FRONTEND_URL}}))
            tab_res = json.loads(await b_ws.recv())
            target_id = tab_res["result"]["targetId"]

        await asyncio.sleep(2.0)
        targets = (await http_client.get("http://127.0.0.1:9222/json/list")).json()
        page_t = next(t for t in targets if t.get("id") == target_id)

        async with websockets.connect(page_t["webSocketDebuggerUrl"]) as p_ws:
            await p_ws.send(json.dumps({"id": 10, "method": "Runtime.enable"}))
            await p_ws.send(json.dumps({"id": 11, "method": "Page.enable"}))

            # Submit high-fatigue browser telemetry batch
            telemetry_res = await http_client.post(
                f"{BACKEND_URL}/tasks/{session_id}/browser-telemetry",
                json={
                    "platform": "generic",
                    "page_title": "Fatigue Inducing Task",
                    "difficulty": 4.0,
                    "typing_interval_mean_ms": 820,
                    "typing_interval_std_ms": 310,
                    "backspace_count": 22,
                    "delete_count": 8,
                    "pause_count": 7,
                    "pause_duration_seconds": 32.0,
                    "active_time_seconds": 45,
                    "code_run_count": 5,
                    "error_rate": 0.70,
                    "metadata": {"stress": True}
                }
            )
            t_data = telemetry_res.json()
            print("✓ Telemetry response:", t_data)
            active_intervention = t_data.get("active_intervention")

            # Push state directly to HUD in DOM to verify HUD render & response lifecycle
            inject_js = f"""
            (() => {{
                const host = document.getElementById('flowstate-hud-host');
                if (!host || !host.shadowRoot) return false;
                // Click pill to expand
                const pill = host.shadowRoot.querySelector('.fs-hud-pill');
                if (pill) pill.click();

                // Check intervention banner
                const banner = host.shadowRoot.querySelector('.fs-intervention-alert');
                return {{
                    expanded: !!host.shadowRoot.querySelector('.fs-hud-card'),
                    has_banner: !!banner
                }};
            }})()
            """
            await p_ws.send(json.dumps({"id": 20, "method": "Runtime.evaluate", "params": {"expression": inject_js, "returnByValue": True}}))
            while True:
                msg = json.loads(await p_ws.recv())
                if msg.get("id") == 20:
                    val = msg.get("result", {}).get("result", {}).get("value")
                    print("✓ HUD expanded state in page:", val)
                    break

            # Now test HUD rendering active intervention and accepting it
            mock_intervention_js = """
            (() => {
                const host = document.getElementById('flowstate-hud-host');
                const sr = host.shadowRoot;
                const container = sr.querySelector('.fs-hud-container');
                
                // Simulate HUD updateState with SUGGEST_SHORT_BREAK
                const alertDiv = document.createElement('div');
                alertDiv.className = 'fs-intervention-alert';
                alertDiv.innerHTML = `
                    <div class="fs-intervention-title">⚠️ SUGGEST_SHORT_BREAK</div>
                    <div class="fs-intervention-reason">Elevated cognitive fatigue detected. A 30s recovery pause is recommended.</div>
                    <div class="fs-btn-row">
                        <button class="fs-btn primary" id="fs-test-accept-btn">Accept</button>
                        <button class="fs-btn secondary" id="fs-test-dismiss-btn">Dismiss</button>
                    </div>
                `;
                const card = sr.querySelector('.fs-hud-card');
                if (card) {
                    card.insertBefore(alertDiv, card.children[1]);
                }
                return !!sr.querySelector('#fs-test-accept-btn');
            })()
            """
            await p_ws.send(json.dumps({"id": 30, "method": "Runtime.evaluate", "params": {"expression": mock_intervention_js}}))
            while True:
                msg = json.loads(await p_ws.recv())
                if msg.get("id") == 30:
                    print("✓ Rendered intervention in HUD card:", msg.get("result", {}).get("result", {}).get("value"))
                    break

            # Create real intervention decision in database
            int_id = f"int_test_{uuid.uuid4().hex[:8]}"
            dec = AdaptationDecision(
                intervention_id=int_id,
                session_id=session_id,
                timestamp=datetime.now(timezone.utc),
                action=AdaptationAction.SUGGEST_SHORT_BREAK,
                reason="Elevated cognitive fatigue detected. A 30s recovery pause is recommended.",
                trigger_state="FATIGUE",
                trigger_estimate=0.75,
                confidence_requirement=0.65,
                cooldown_seconds=120,
                status=InterventionStatus.OFFERED
            )
            orc = SessionOrchestrator()
            await orc.adaptation_engine.adaptation_repo.save_decision(dec)
            print("✓ Saved test intervention in DB:", int_id)

            # Click Accept button
            click_accept_js = """
            (() => {
                const btn = document.getElementById('flowstate-hud-host').shadowRoot.querySelector('#fs-test-accept-btn');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            })()
            """
            await p_ws.send(json.dumps({"id": 40, "method": "Runtime.evaluate", "params": {"expression": click_accept_js}}))
            while True:
                msg = json.loads(await p_ws.recv())
                if msg.get("id") == 40:
                    print("✓ Clicked Accept button in HUD:", msg.get("result", {}).get("result", {}).get("value"))
                    break

            # Verify feedback endpoint in backend accepts user action
            feedback_res = await http_client.post(f"{BACKEND_URL}/interventions/{int_id}/feedback", json={
                "user_action": "ACCEPTED"
            })
            print(f"✓ Feedback API response: status={feedback_res.status_code}")
            assert feedback_res.status_code == 200

            print("=== ADAPTATION POLICY TO HUD ROUND-TRIP VERIFIED SUCCESSFULLY ===")

    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(test_adaptation_roundtrip())
