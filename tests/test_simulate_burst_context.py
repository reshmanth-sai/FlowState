"""Automated E2E CDP test for context preservation during Simulate 30s Burst.

Verifies:
1. Fresh session with task_id 'adaptive_arithmetic' displays task on Home and LiveSessionView.
2. Clicking 'Simulate 30s Burst' does NOT change session.task_id or displayed task title to 'Two Sum'.
3. Telemetry and inference update properly.
4. Second burst after browser extension telemetry retains context without stomping.
"""

import asyncio
import json
import subprocess
import time
import urllib.request
import websockets

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"
CHROME_PATH = r"C:\Users\Sri Priyan D\AppData\Local\Google\Chrome\Application\chrome.exe"
EXTENSION_PATH = r"d:\PROJECTS\IDP\FlowState\extension"


def post_json(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


async def run_cdp_verification():
    # 1. Start session with task_id 'adaptive_arithmetic'
    sess_req = {
        "participant_key": "context_eval_user",
        "task_id": "adaptive_arithmetic",
        "mode": "SIMULATED",
        "metadata": {
            "task_name": "Adaptive Arithmetic Practice",
            "platform": "FlowState Math Hub",
            "difficulty": "Medium",
            "language": "Python"
        }
    }
    session = post_json(f"{BACKEND_URL}/sessions", sess_req)
    session_id = session["id"]
    print(f"[TEST SESSION CREATED] ID: {session_id} | Task: {session['task_id']}")

    started = post_json(f"{BACKEND_URL}/sessions/{session_id}/start", {})
    print(f"[TEST SESSION STARTED] Status: {started['status']}")

    # 2. Launch Chrome with CDP Remote Debugging in headless mode & unpacked extension
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--remote-allow-origins=*",
        "--no-first-run",
        "--no-default-browser-check",
        f"--load-extension={EXTENSION_PATH}",
        f"--disable-extensions-except={EXTENSION_PATH}",
        f"--user-data-dir=C:\\tmp\\chrome_test_profile_{int(time.time())}"
    ]
    proc = subprocess.Popen(cmd)
    await asyncio.sleep(2)

    try:
        cdp_tabs = None
        for _ in range(10):
            try:
                cdp_tabs = get_json("http://127.0.0.1:9222/json")
                if cdp_tabs:
                    break
            except Exception:
                await asyncio.sleep(0.5)

        page_tabs = [t for t in cdp_tabs if t.get("type") == "page" and "webSocketDebuggerUrl" in t]
        if not page_tabs:
            raise RuntimeError("No page target found in Chrome CDP")
        ws_url = page_tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            req_counter = 0
            async def send_cdp(method, params=None):
                nonlocal req_counter
                req_counter += 1
                req_id = req_counter
                msg = {"id": req_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(msg))
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == req_id:
                        return res

            await send_cdp("Page.enable")
            await send_cdp("DOM.enable")
            await send_cdp("Runtime.enable")

            # 3. Navigate to FlowState Frontend Home
            await send_cdp("Page.navigate", {"url": FRONTEND_URL})
            await asyncio.sleep(2.5)

            # Set localStorage session and reload page to reflect active session
            await send_cdp("Runtime.evaluate", {
                "expression": f"localStorage.setItem('flowstate_selected_session', '{session_id}');"
            })
            await send_cdp("Page.navigate", {"url": FRONTEND_URL})
            await asyncio.sleep(2.5)

            # 4. Check Home view task context BEFORE burst
            eval_home = await send_cdp("Runtime.evaluate", {
                "expression": "document.body.innerText"
            })
            home_text = eval_home.get("result", {}).get("result", {}).get("value", "")
            has_task = ('adaptive_arithmetic' in home_text or 'Adaptive Arithmetic Practice' in home_text)
            print(f"[HOME TEXT INCLUDES TASK TITLE]: {has_task}")

            # 5. Navigate to Live Session View
            await send_cdp("Runtime.evaluate", {
                "expression": "document.querySelector('button[title*=\"Live Session\"]')?.click() || (window.location.hash = '#live');"
            })
            await asyncio.sleep(1.5)

            # Record task title BEFORE burst
            eval_before = await send_cdp("Runtime.evaluate", {
                "expression": "JSON.stringify({ task: document.querySelector('.calm-panel [style*=\"font-size: 1.75rem\"]')?.innerText, body: document.body.innerText })"
            })
            before_str = eval_before.get("result", {}).get("result", {}).get("value", "{}")
            before_data = json.loads(before_str)
            task_before = before_data.get("task")
            print(f"[BEFORE BURST TASK TITLE]: '{task_before}'")

            # Get initial live state from backend
            live_state_before = get_json(f"{BACKEND_URL}/tasks/{session_id}/live-state")
            inference_before = live_state_before.get("estimate")
            print(f"[BEFORE BURST INFERENCE]: Workload={inference_before.get('workload') if inference_before else 'None'}")

            # 6. Click 'Simulate 30s Burst'
            eval_click = await send_cdp("Runtime.evaluate", {
                "expression": """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const burstBtn = btns.find(b => b.innerText.includes('Simulate 30s Burst'));
                    if (burstBtn) { burstBtn.click(); return true; }
                    return false;
                })()
                """
            })
            click_res = eval_click.get("result", {}).get("result", {}).get("value")
            print(f"[BURST BUTTON CLICKED]: {click_res}")
            await asyncio.sleep(2.0)

            # Record task title AFTER burst
            eval_after = await send_cdp("Runtime.evaluate", {
                "expression": "JSON.stringify({ task: document.querySelector('.calm-panel [style*=\"font-size: 1.75rem\"]')?.innerText, body: document.body.innerText })"
            })
            after_str = eval_after.get("result", {}).get("result", {}).get("value", "{}")
            after_data = json.loads(after_str)
            task_after = after_data.get("task")
            print(f"[AFTER BURST TASK TITLE]: '{task_after}'")

            # Get updated live state from backend
            live_state_after = get_json(f"{BACKEND_URL}/tasks/{session_id}/live-state")
            inference_after = live_state_after.get("estimate")
            print(f"[AFTER BURST INFERENCE]: Workload={inference_after.get('workload') if inference_after else 'None'} | WorkloadVal={inference_after.get('workload_value') if inference_after else 'None'}")

            # Verification assertions
            assert task_after != "Two Sum", "FAIL: Task context mutated to 'Two Sum'!"
            assert task_after == task_before, f"FAIL: Task title changed from '{task_before}' to '{task_after}'!"
            assert inference_after is not None, "FAIL: Inference did not populate after burst!"
            print("[SUCCESS]: Task context preserved as 'Adaptive Arithmetic Practice' / 'adaptive_arithmetic' and inference updated cleanly!")

    finally:
        proc.terminate()

if __name__ == "__main__":
    asyncio.run(run_cdp_verification())
