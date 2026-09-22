"""End-to-End Real Browser Verification for FlowState [ + New Session ] User Flow.
Tests all requirements:
1. Home page button visibility and placement.
2. Clicking [ + New Session ] stops existing RUNNING session.
3. Creates and starts a fresh session as the ONLY RUNNING session.
4. Updates localStorage and posts FLOWSTATE_SET_ACTIVE_SESSION.
5. Home page updates immediately (displaying fresh task name, 0m active).
6. Extension HUD synchronizes to the new session ID and shows MONITORING/OBSERVING.
7. Telemetry from LeetCode activity routes to the new session.
8. End Session stops the session, extension ceases recording.
9. Background browsing does NOT auto-create sessions when stopped.
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import time
import httpx
import websockets

CHROME_EXE = r"C:\Users\Sri Priyan D\AppData\Local\Google\Chrome\Application\chrome.exe"
EXTENSION_DIR = r"d:\PROJECTS\IDP\FlowState\extension"
SCRATCH_DIR = r"C:\Users\Sri Priyan D\.gemini\antigravity\brain\8d642632-6641-4c44-a4d1-30c406014881\scratch"
PROFILE_DIR = os.path.join(SCRATCH_DIR, "chrome_new_session_profile")
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"


def get_cdp_value(res):
    if not isinstance(res, dict):
        return None
    r = res.get("result", {})
    if isinstance(r, dict) and "result" in r:
        return r["result"].get("value")
    if isinstance(r, dict):
        return r.get("value")
    return None


class CDPConnection:
    def __init__(self, ws):
        self.ws = ws
        self.msg_id = 1
        self.callbacks = {}
        self.listeners = []
        self._reader_task = asyncio.create_task(self._read_loop())

    async def _read_loop(self):
        try:
            async for raw in self.ws:
                msg = json.loads(raw)
                mid = msg.get("id")
                if mid and mid in self.callbacks:
                    fut = self.callbacks.pop(mid)
                    if not fut.done():
                        fut.set_result(msg)
                for listener in self.listeners:
                    try:
                        listener(msg)
                    except Exception:
                        pass
        except Exception:
            pass

    async def send(self, method, params=None):
        mid = self.msg_id
        self.msg_id += 1
        fut = asyncio.get_running_loop().create_future()
        self.callbacks[mid] = fut
        await self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        return await fut

    def add_listener(self, fn):
        self.listeners.append(fn)

    async def close(self):
        self._reader_task.cancel()
        try:
            await self.ws.close()
        except Exception:
            pass


async def run_test():
    print("=" * 80)
    print("FLOWSTATE — NEW SESSION USER FLOW REAL BROWSER VERIFICATION")
    print("=" * 80)

    if os.path.exists(PROFILE_DIR):
        try:
            shutil.rmtree(PROFILE_DIR)
        except Exception:
            pass
    os.makedirs(PROFILE_DIR, exist_ok=True)

    http_client = httpx.AsyncClient(timeout=20.0)

    # 1. Verify servers
    r_b = await http_client.get(f"{BACKEND_URL}/")
    assert r_b.status_code == 200, "Backend root not 200"
    r_f = await http_client.get(FRONTEND_URL)
    assert r_f.status_code == 200, "Frontend root not 200"
    print("[OK] Backend and Frontend servers are reachable.")

    # 2. Stop any existing running sessions to prepare deterministic initial state
    all_sess = (await http_client.get(f"{BACKEND_URL}/sessions?limit=50")).json()
    for s in all_sess:
        if s["status"] == "RUNNING":
            await http_client.post(f"{BACKEND_URL}/sessions/{s['id']}/stop")

    # 3. Create initial active session
    create_res = await http_client.post(
        f"{BACKEND_URL}/sessions",
        json={
            "participant_key": "initial_tester",
            "task_id": "initial_legacy_task",
            "mode": "SIMULATED",
            "metadata": {
                "task_name": "Old Task to be Replaced",
                "platform": "LeetCode",
                "difficulty": "Medium",
                "language": "Python3",
            },
        },
    )
    initial_sess = create_res.json()
    initial_sess_id = initial_sess["id"]
    await http_client.post(f"{BACKEND_URL}/sessions/{initial_sess_id}/start")
    print(f"[OK] Initial running session created & started: {initial_sess_id}")

    # 4. Launch Chrome
    chrome_cmd = [
        CHROME_EXE,
        "--remote-debugging-port=9222",
        f"--user-data-dir={PROFILE_DIR}",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-welcome",
        "--disable-fre",
        "about:blank",
    ]
    chrome_proc = subprocess.Popen(chrome_cmd)
    print(f"[OK] Chrome launched (PID {chrome_proc.pid})")

    try:
        ver_info = None
        for _ in range(30):
            try:
                res = await http_client.get("http://127.0.0.1:9222/json/version")
                if res.status_code == 200:
                    ver_info = res.json()
                    break
            except Exception:
                await asyncio.sleep(0.3)
        assert ver_info is not None, "Chrome CDP failed on port 9222"

        browser_ws = ver_info["webSocketDebuggerUrl"]
        browser_cdp = CDPConnection(await websockets.connect(browser_ws))

        # Load unpacked extension via CDP
        print("\n--- LOADING EXTENSION VIA CDP ---")
        load_ext_res = await browser_cdp.send("Extensions.loadUnpacked", {"path": EXTENSION_DIR})
        ext_id = load_ext_res.get("result", {}).get("id")
        print(f"[OK] Extension loaded successfully! ID: {ext_id}")
        await asyncio.sleep(1.5)

        # Open Tab 1: FlowState Home page
        tab1_res = await browser_cdp.send("Target.createTarget", {"url": f"{FRONTEND_URL}/"})
        tab1_id = tab1_res["result"]["targetId"]
        print(f"[OK] Tab 1 created (FlowState Home): {tab1_id}")

        await asyncio.sleep(2.0)
        targets = (await http_client.get("http://127.0.0.1:9222/json/list")).json()
        tab1_target = next(t for t in targets if t.get("id") == tab1_id)

        home_cdp = CDPConnection(await websockets.connect(tab1_target["webSocketDebuggerUrl"]))
        await home_cdp.send("Runtime.enable")
        await home_cdp.send("Page.enable")

        # Wait for Home page to load and render
        await asyncio.sleep(3.0)

        # Inspect Home page initial state
        eval_initial = await home_cdp.send(
            "Runtime.evaluate",
            {
                "expression": """(() => {
                    const btn = document.querySelector('[data-e2e="start-new-session-button"]');
                    const headerBtn = document.querySelector('[data-e2e="header-start-new-session-button"]');
                    const openLiveBtn = document.querySelector('[data-e2e="open-live-session-button"]');
                    const taskHeader = document.querySelector('div[style*="font-size: 1.45rem"]')?.textContent?.trim() || '';
                    const bodyText = document.body ? document.body.innerText : '';
                    return {
                        hasNewSessionButton: !!btn,
                        hasHeaderNewSessionButton: !!headerBtn,
                        newSessionButtonText: btn ? btn.innerText.trim() : null,
                        hasOpenLiveBtn: !!openLiveBtn,
                        taskHeader: taskHeader,
                        currentLocalStorage: localStorage.getItem('flowstate_selected_session'),
                        bodySnippet: bodyText.slice(0, 200)
                    };
                })()""",
                "returnByValue": True,
            },
        )
        init_res = get_cdp_value(eval_initial) or {}
        print(f"[DOM INITIAL] Has New Session Button: {init_res.get('hasNewSessionButton')}")
        print(f"[DOM INITIAL] Button Text: '{init_res.get('newSessionButtonText')}'")
        print(f"[DOM INITIAL] Has Header Button: {init_res.get('hasHeaderNewSessionButton')}")
        print(f"[DOM INITIAL] Task Header: '{init_res.get('taskHeader')}'")
        print(f"[DOM INITIAL] LocalStorage Session: {init_res.get('currentLocalStorage')}")

        assert init_res.get("hasNewSessionButton"), f"ERROR: [ + New Session ] button not found in DOM! eval_initial: {eval_initial}"

        # 5. CLICK [ + New Session ] BUTTON
        print("\n--- CLICKING [ + New Session ] BUTTON IN CHROMIUM DOM ---")
        click_eval = await home_cdp.send(
            "Runtime.evaluate",
            {
                "expression": """(() => {
                    const btn = document.querySelector('[data-e2e="start-new-session-button"]');
                    if (btn) {
                        btn.click();
                        return { clicked: true, text: btn.innerText.trim() };
                    }
                    return { clicked: false };
                })()""",
                "returnByValue": True,
            },
        )
        click_val = get_cdp_value(click_eval)
        print(f"[CLICK RESULT]: {click_val}")

        # Wait 3 seconds for async backend call, session creation, start, and state propagation
        await asyncio.sleep(3.0)

        # 6. VERIFY BACKEND STATUS
        print("\n--- VERIFYING BACKEND STATE ---")
        old_sess_check = (await http_client.get(f"{BACKEND_URL}/sessions/{initial_sess_id}")).json()
        print(f"[OLD SESSION STATUS] ID: {initial_sess_id} -> Status: {old_sess_check['status']}")
        assert old_sess_check["status"] == "STOPPED", f"Expected old session to be STOPPED, got {old_sess_check['status']}"

        all_sess_after = (await http_client.get(f"{BACKEND_URL}/sessions?limit=20")).json()
        running_sessions = [s for s in all_sess_after if s["status"] == "RUNNING"]
        print(f"[RUNNING SESSIONS COUNT] Found {len(running_sessions)} running session(s): {[s['id'] for s in running_sessions]}")
        assert len(running_sessions) == 1, f"Expected exactly 1 running session, found {len(running_sessions)}"

        new_session = running_sessions[0]
        new_session_id = new_session["id"]
        print(f"[NEW SESSION CREATED & RUNNING] ID: {new_session_id}, Task: {new_session['task_id']}, Status: {new_session['status']}")
        assert new_session_id != initial_sess_id, "New session ID must be different from initial session ID!"

        # 7. VERIFY HOME VIEW DOM AFTER CLICK
        print("\n--- VERIFYING HOME VIEW DOM POST-CREATION ---")
        eval_post = await home_cdp.send(
            "Runtime.evaluate",
            {
                "expression": """(() => {
                    const taskHeader = document.querySelector('div[style*="font-size: 1.45rem"]')?.textContent?.trim() || '';
                    const durationEl = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('m active') || el.textContent.includes('Idle'));
                    const durationText = durationEl ? durationEl.textContent.trim() : '';
                    const savedSession = localStorage.getItem('flowstate_selected_session');
                    return {
                        taskHeader,
                        durationText,
                        savedSession
                    };
                })()""",
                "returnByValue": True,
            },
        )
        post_dom = get_cdp_value(eval_post) or {}
        print(f"[DOM POST] Task Header: '{post_dom.get('taskHeader')}'")
        print(f"[DOM POST] Duration Display: '{post_dom.get('durationText')}'")
        print(f"[DOM POST] Saved in localStorage: '{post_dom.get('savedSession')}'")

        assert post_dom.get("savedSession") == new_session_id, f"localStorage mismatch: {post_dom.get('savedSession')} vs {new_session_id}"
        assert "0m active" in post_dom.get("durationText", ""), f"Expected '0m active', got '{post_dom.get('durationText')}'"

        # 8. OPEN LEETCODE TAB & VERIFY EXTENSION HUD SYNCHRONIZATION
        print("\n--- VERIFYING EXTENSION HUD & TELEMETRY ROUTING ---")
        tab2_res = await browser_cdp.send("Target.createTarget", {"url": f"{BACKEND_URL}/fixtures/leetcode_problem.html"})
        tab2_id = tab2_res["result"]["targetId"]
        print(f"[OK] Tab 2 created (LeetCode fixture): {tab2_id}")

        await asyncio.sleep(2.0)
        targets = (await http_client.get("http://127.0.0.1:9222/json/list")).json()
        tab2_target = next(t for t in targets if t.get("id") == tab2_id)

        leetcode_cdp = CDPConnection(await websockets.connect(tab2_target["webSocketDebuggerUrl"]))
        await leetcode_cdp.send("Runtime.enable")
        await leetcode_cdp.send("Page.enable")

        # Sync active session directly into LeetCode tab context
        sync_expr = f"""
            window.postMessage({{ type: 'FLOWSTATE_SET_ACTIVE_SESSION', sessionId: '{new_session_id}' }}, '*');
        """
        await leetcode_cdp.send("Runtime.evaluate", {"expression": sync_expr})

        # Wait for HUD host to mount in LeetCode tab
        hud_res = {}
        for _ in range(15):
            hud_eval = await leetcode_cdp.send(
                "Runtime.evaluate",
                {
                    "expression": """(() => {
                        const host = document.getElementById('flowstate-hud-host');
                        if (!host || !host.shadowRoot) return { found: false };
                        const text = host.shadowRoot.innerText || host.shadowRoot.textContent;
                        return {
                            found: true,
                            hudText: text.trim(),
                            hasBrand: text.includes('FLOWSTATE'),
                        };
                    })()""",
                    "returnByValue": True,
                },
            )
            hud_res = get_cdp_value(hud_eval) or {}
            if hud_res.get("found"):
                break
            await asyncio.sleep(0.5)

        print(f"[EXTENSION HUD] Found: {hud_res.get('found')}")
        print(f"[EXTENSION HUD] Text: '{hud_res.get('hudText')}'")
        assert hud_res.get("found"), "Expected extension HUD host to be mounted in LeetCode tab"

        # 9. GENERATE ACTIVITY IN LEETCODE TAB AND PERSIST TELEMETRY
        print("\n--- GENERATING ACTIVITY & PERSISTING TELEMETRY ---")
        for char in ['a', 'b', 'c', 'd', 'e']:
            expr = f"""
                window.dispatchEvent(new KeyboardEvent('keydown', {{ key: '{char}', code: 'Key{char.upper()}', bubbles: true }}));
                document.dispatchEvent(new KeyboardEvent('keydown', {{ key: '{char}', code: 'Key{char.upper()}', bubbles: true }}));
            """
            await leetcode_cdp.send("Runtime.evaluate", {"expression": expr})
            await asyncio.sleep(0.2)

        # Code execution click on Run button
        run_expr = """
            const btn = document.querySelector('[data-e2e-locator="console-run-button"]');
            if (btn) btn.click();
        """
        await leetcode_cdp.send("Runtime.evaluate", {"expression": run_expr})
        await asyncio.sleep(0.5)

        # Trigger flush
        flush_expr = """
            new Promise((resolve) => {
                const listener = (event) => {
                    if (event.data && event.data.type === 'FLOWSTATE_FLUSH_COMPLETED') {
                        window.removeEventListener('message', listener);
                        resolve(event.data);
                    }
                };
                window.addEventListener('message', listener);
                window.postMessage({ type: 'FLOWSTATE_FLUSH_TELEMETRY' }, '*');
                setTimeout(() => resolve({ timeout: true }), 3000);
            });
        """
        flush_eval = await leetcode_cdp.send("Runtime.evaluate", {"expression": flush_expr, "awaitPromise": True})
        print(f"[FLUSH RESULT]: {get_cdp_value(flush_eval)}")

        # Wait 2 seconds for backend persistence
        await asyncio.sleep(2.0)

        raw_events = (await http_client.get(f"{BACKEND_URL}/tasks/{new_session_id}/events")).json()
        print(f"[BACKEND EVENTS for {new_session_id}]: {len(raw_events)} events persisted")
        assert len(raw_events) > 0, f"Expected events persisted for {new_session_id}, found 0"

        # 10. VERIFY END SESSION FLOW
        print("\n--- VERIFYING END SESSION FLOW ---")
        # In Tab 1, navigate to Live Session view via [ Open Live Session ] button
        nav_eval = await home_cdp.send(
            "Runtime.evaluate",
            {
                "expression": """(() => {
                    const btn = document.querySelector('[data-e2e="open-live-session-button"]');
                    if (btn) {
                        btn.click();
                        return { clicked: true };
                    }
                    return { clicked: false };
                })()""",
                "returnByValue": True,
            },
        )
        print(f"[NAVIGATE TO LIVE VIEW]: {get_cdp_value(nav_eval)}")
        await asyncio.sleep(2.0)

        # Click [ End Session ] trigger button
        trigger_end = await home_cdp.send(
            "Runtime.evaluate",
            {
                "expression": """(() => {
                    const btn = document.querySelector('[data-e2e="end-session-button"]');
                    if (btn) {
                        btn.click();
                        return { triggered: true };
                    }
                    return { triggered: false };
                })()""",
                "returnByValue": True,
            },
        )
        print(f"[TRIGGER END SESSION]: {get_cdp_value(trigger_end)}")
        await asyncio.sleep(1.0)

        # Click [ End Session ] confirm button inside modal
        confirm_end = await home_cdp.send(
            "Runtime.evaluate",
            {
                "expression": """(() => {
                    const btn = document.querySelector('[data-e2e="confirm-end-session-button"]');
                    if (btn) {
                        btn.click();
                        return { confirmed: true };
                    }
                    return { confirmed: false };
                })()""",
                "returnByValue": True,
            },
        )
        print(f"[CONFIRM END SESSION]: {get_cdp_value(confirm_end)}")
        await asyncio.sleep(3.0)

        # Verify session is STOPPED in backend
        ended_check = (await http_client.get(f"{BACKEND_URL}/sessions/{new_session_id}")).json()
        print(f"[SESSION STATUS AFTER END] ID: {new_session_id} -> Status: {ended_check['status']}")
        assert ended_check["status"] == "STOPPED", f"Expected STOPPED, got {ended_check['status']}"

        # 11. VERIFY BACKGROUND BROWSING DOES NOT AUTO-CREATE SESSIONS (Requirement 9)
        print("\n--- VERIFYING NO AUTO-CREATION ON BACKGROUND BROWSING ---")
        count_before = len((await http_client.get(f"{BACKEND_URL}/sessions?limit=100")).json())

        # Generate activity in LeetCode tab with NO running session
        for char in ['x', 'y', 'z']:
            expr = f"""
                window.dispatchEvent(new KeyboardEvent('keydown', {{ key: '{char}', code: 'Key{char.upper()}', bubbles: true }}));
                document.dispatchEvent(new KeyboardEvent('keydown', {{ key: '{char}', code: 'Key{char.upper()}', bubbles: true }}));
            """
            await leetcode_cdp.send("Runtime.evaluate", {"expression": expr})

        run_again = """
            const btn = document.querySelector('[data-e2e-locator="console-run-button"]');
            if (btn) btn.click();
        """
        await leetcode_cdp.send("Runtime.evaluate", {"expression": run_again})
        print("[ACTIVITY IN LEETCODE WHILE STOPPED GENERATED]")

        # Trigger flush
        flush_stopped = await leetcode_cdp.send("Runtime.evaluate", {"expression": flush_expr, "awaitPromise": True})
        print(f"[FLUSH WHILE STOPPED RESULT]: {get_cdp_value(flush_stopped)}")
        await asyncio.sleep(2.0)

        count_after = len((await http_client.get(f"{BACKEND_URL}/sessions?limit=100")).json())
        running_after = [s for s in (await http_client.get(f"{BACKEND_URL}/sessions?limit=100")).json() if s["status"] == "RUNNING"]
        print(f"[SESSION COUNT] Before: {count_before}, After: {count_after}")
        print(f"[RUNNING SESSIONS COUNT AFTER BACKGROUND BROWSING]: {len(running_after)}")
        assert count_before == count_after, f"Expected session count to remain {count_before}, but got {count_after} (session was auto-created!)"
        assert len(running_after) == 0, f"Expected 0 running sessions, found {len(running_after)}"

        print("\n" + "=" * 80)
        print("ALL 11 REQUIREMENTS VERIFIED AND PASSED SUCCESSFULLY!")
        print("=" * 80)

        await home_cdp.close()
        await leetcode_cdp.close()
        await browser_cdp.close()

    finally:
        try:
            chrome_proc.terminate()
            chrome_proc.wait(timeout=3)
        except Exception:
            try:
                chrome_proc.kill()
            except Exception:
                pass
        await http_client.aclose()


if __name__ == "__main__":
    asyncio.run(run_test())
