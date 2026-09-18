# Flowstate Browser Extension (Phase 1)

Privacy-preserving browser extension observing computer/task interaction behavior and page context for **Flowstate: A Multimodal, Context-Aware System for Personalized Adaptive Web Interfaces**.

---

## 1. Purpose & Strategic Architecture

Flowstate uses a **dual-instrument strategy**:
1. **Controlled Reference Instrument**: The built-in Adaptive Mental Arithmetic task remains the calibrated baseline testbed with ground-truth difficulty levels.
2. **Real-World Deployment Layer**: The browser extension injects into real external coding and learning platforms (e.g., LeetCode, GitHub, documentation, localhost) to demonstrate ecological validity across open web workflows.

```text
┌─────────────────────────────────────────────────────────────┐
│                 SUPPORTED WEBPAGE (e.g. LeetCode)           │
│                                                             │
│   Context Extractor              Behavioral Telemetry       │
│   • Platform: leetcode           • Typing interval mean/std │
│   • Difficulty: Hard             • Backspace / delete count │
│   • Problem Title                • Inactivity pause count/s │
│   (Zero code logged)             (Zero raw keystrokes)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ 15s Local Aggregation
                               ▼
┌─────────────────────────────────────────────────────────────┐
│        BACKGROUND SERVICE WORKER (Sole Session Owner)       │
│  • Discovers or establishes active Flowstate session        │
│  • Enforces SourceType.COMPUTER_BEHAVIOR provenance         │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /tasks/{session_id}/browser-telemetry
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 FLOWSTATE FASTAPI BACKEND                   │
│  Quality Gate • Windowing • Features • Inference • Policy   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Inferences & Adaptation Decisions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            INJECTED EXTENSION HUD (Shadow DOM)              │
│  • Non-blocking floating pill pinned to bottom-right        │
│  • Displays Workload, Fatigue, Quality Gate                 │
│  • Renders authoritative adaptation actions                 │
└─────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Core Principle**: *"The browser is an observation layer, not a decision layer."*
> The extension never calculates its own thresholds or triggers adaptation actions locally. The Flowstate backend remains the sole authoritative source of truth.

---

## 2. Privacy-First Data Contract

Flowstate enforces strict privacy guarantees at both the client and server levels:

### ✅ Telemetry Collected (Aggregate Mathematical Metrics Only)
- **Typing Cadence**: Inter-key interval mean ($\text{ms}$) and standard deviation ($\text{ms}$).
- **Editing Activity**: Cumulative backspace and delete counts (count only, not what was deleted).
- **Pauses & Freezes**: Periods of inactivity exceeding 4 seconds (count, total seconds, longest pause seconds).
- **Tab Visibility**: Active vs. hidden window durations and transition counts.
- **Page Context**: Hostname, platform name, problem difficulty scalar ($1.0, 2.5, 4.0$), and sanitized document title.

### 🚫 Telemetry Strictly NOT Collected (Zero Surveillance)
- **NO raw keystroke characters or text**.
- **NO typed source code or editor contents**.
- **NO passwords or form data** (fields with `type="password"` or `data-private` are fully shielded).
- **NO clipboard contents**.
- **NO arbitrary URL paths or query parameters**.
- **NO full-page DOM text, screenshots, webcam, or audio**.

---

## 3. Installation in Chrome / Chromium Developer Mode

### Step 1: Start the Flowstate Backend
```bash
cd /Users/sai/FlowState
source .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Ensure backend is healthy at: [http://localhost:8000/system/status](http://localhost:8000/system/status).

### Step 2: Load Extension in Chrome
1. Open Google Chrome or any Chromium-based browser (Edge, Brave, Arc).
2. Navigate to `chrome://extensions`.
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. Click **"Load unpacked"** in the top-left corner.
5. Select the folder: `/Users/sai/FlowState/extension`.
6. Confirm that **"Flowstate Cognitive Adaptive Copilot"** appears in your extensions list.

### Step 3: Test on a Supported Website
1. Open [http://localhost:5173](http://localhost:5173) or any problem on [https://leetcode.com/problems/](https://leetcode.com/problems/).
2. Look at the bottom-right corner of the webpage:
   - You will see the floating pill: `⚡ FLOWSTATE • MONITORING`.
3. Click the pill to expand the live cognitive monitor card showing:
   - Estimated Workload gauge
   - Estimated Fatigue gauge
   - Estimated Engagement gauge
   - Current Quality Gate (`PASS`, `DEGRADED`, or `INSUFFICIENT`)
   - Session ID binding.

---

## 4. Permissions Requested

| Permission | Purpose |
| :--- | :--- |
| `storage` | Preserves the active `session_id` and collapsed/expanded HUD preferences across page reloads. |
| Host: `http://localhost:8000/*` | Communicates with the local Flowstate FastAPI backend orchestrator. |
| Host: `*://*.leetcode.com/*` | Injects observation script and HUD into coding challenge sessions. |
| Host: `*://github.com/*` | Injects observation script into coding review workflows. |
| Host: `http://localhost/*` | Enables local development, testing, and debugging. |

*Note: The extension explicitly avoids `<all_urls>`, `tabs`, `clipboardRead`, `webRequest`, `cookies`, and other intrusive permissions.*

---

## 5. Verification & Tests

To run the automated extension verification suite:
```bash
node extension/tests/telemetry.test.js
```

Verifies:
1. Zero keylogging invariant.
2. Mathematical mean and sample standard deviation calculations.
3. Idle pause detection.
4. Provenance enforcement (`SourceType.COMPUTER_BEHAVIOR`).
5. Context isolation without arbitrary DOM capture.
6. Privacy validator rejection of forbidden fields.

---

## 6. Scientific Limitations & Disclosures

- **Research Prototype**: The extension provides real-time behavioral interaction metrics to the Flowstate inference pipeline. State indices reflect model estimates rather than clinical diagnoses.
- **Wearable Boundary**: In Phase 1, the extension operates in `COMPUTER_BEHAVIOR` mode. Physical smartwatch Bluetooth pairing is supported in the web platform and planned for direct extension bridge in Phase 2. No synthetic physiological data is generated or masqueraded as wearable telemetry.
