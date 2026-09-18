# Flowstate: A Multimodal, Context-Aware System for Personalized Adaptive Web Interfaces

Flowstate is a personalized, context-aware cognitive-efficiency research platform. It combines consumer-wearable signals, computer/task behaviour, temporal patterns, and individual baseline calibration to estimate changing **cognitive workload**, **fatigue**, and **engagement**, driving an explainable, closed-loop adaptive web interface.

---

## Key Principles & Scientific Safeguards

1. **Estimated States, Not Diagnoses**: Workload, fatigue, and engagement are reported as *model estimates* relative to context, never as medical or clinical diagnoses.
2. **Accessible Hardware Boundary**: The declared physical boundary is a **computer + consumer smartwatch/wearable** (PPG-derived heart rate and accelerometer motion).
3. **No Scientific Overclaiming**:
   - Smartwatch PPG heart rate is never represented as a clinical ECG waveform.
   - Consumer wearable signals are never falsely claimed as EEG or fNIRS.
   - Unavailable modalities are represented via explicit boolean masks (`availability_mask`), never zero-padded.
4. **Reproducible Demo Mode**: Simulated data is always explicitly labeled `SIMULATED` and passes through the exact same ingestion, synchronization, feature extraction, inference, and adaptation pipeline as live data.
5. **No Fabricated Benchmark Metrics**: Evaluation frameworks report `VALIDATION_PENDING` until validated against genuine external ground-truth datasets.
6. **Follow-the-Signal Traceability**: Every intervention and state estimate can be traced backwards to its contributing evidence, normalized features, sliding window, and raw time-stamped events.

---

## Architecture Overview

```text
                     ┌─────────────────────────────────────────────────────────────┐
                     │              FLOWSTATE WEB PLATFORM (Vite/React)            │
                     │  Overview • Monitor • Follow the Signal • Task • Review ... │
                     └──────────────────────────────┬──────────────────────────────┘
                                                    │
                                      REST APIs + WebSockets
                                                    ▼
                     ┌─────────────────────────────────────────────────────────────┐
                     │              FASTAPI BACKEND ORCHESTRATOR                   │
                     └──────┬───────────────────────┬───────────────────────┬──────┘
                            │                       │                       │
                            ▼                       ▼                       ▼
                   ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
                   │  DATA PROVIDERS │    │  INTERACTIVE     │    │   STORAGE        │
                   │  • Simulator    │    │  COGNITIVE TASK  │    │   SQLite (WAL)   │
                   │  • Importer     │    │  • Adaptive Math │    │   Postgres-ready │
                   │  • Wearable Bnd │    │  • Telemetry     │    │                  │
                   └────────┬────────┘    └─────────┬────────┘    └──────────────────┘
                            │                       │
                            └───────────┬───────────┘
                                        ▼
                            Canonical Event Ingestion
                                        ▼
                            Data Quality Engine (Plausibility, Gaps, Missingness)
                                        ▼
                            Synchronization Engine (30s Sliding Windows, No Leakage)
                                        ▼
                            Feature Extraction (v1.0.0 Feature Registry)
                                        ▼
                            Personalization Engine (Resting Baseline Deltas)
                                        ▼
                            Multimodal Fusion (Behaviour-Only, Wearable-Only, Fused)
                                        ▼
                            Interpretable Baseline Inference (Workload, Fatigue, Engagement)
                                        ▼
                            Confidence & Quality Gating (PASS, DEGRADED, INSUFFICIENT)
                                        ▼
                            Explanation Engine (Non-causal Evidence Attribution)
                                        ▼
                            Closed-Loop Adaptation Engine (Cooldowns, Bounded Interventions)
                                        ▼
                            User Feedback & Outcome Observation
```

---

## Implemented Modules (M01 – M20)

- **M01 Session Manager**: `backend/sessions/orchestrator.py`
- **M02 Data Provider Interface**: `backend/data_providers/base.py`
- **M03 Wearable Adapter**: `backend/data_providers/wearable_adapter.py`
- **M04 Behaviour Collector**: `backend/ingestion/behaviour.py`
- **M05 Ingestion Service**: `backend/ingestion/service.py`
- **M06 Data Quality Engine**: `backend/quality/engine.py`
- **M07 Synchronization Engine**: `backend/synchronization/engine.py`
- **M08 Preprocessing Engine**: `backend/features/engine.py`
- **M09 Feature Engine**: `backend/features/definitions.py`, `backend/features/engine.py`
- **M10 Fusion Engine**: `backend/fusion/engine.py`
- **M11 Inference Engine**: `backend/inference/baseline_models.py`, `backend/inference/engine.py`
- **M12 Confidence Engine**: `backend/confidence/engine.py`
- **M13 Explanation Engine**: `backend/explanation/engine.py`
- **M14 Adaptation Engine**: `backend/adaptation/policy.py`, `backend/adaptation/engine.py`
- **M15 Feedback Engine**: `backend/adaptation/feedback.py`
- **M16 Evaluation Engine**: `backend/api/routes_research.py`
- **M17 Personalization Engine**: `backend/personalization/engine.py`
- **M18 Research Web Experience**: `frontend/src/*`
- **M19 Persistence Layer**: `backend/storage/schema.sql`, `backend/storage/database.py`, `backend/storage/sqlite_repo.py`
- **M20 Demo Orchestrator**: `backend/data_providers/simulator.py`

---

## Getting Started

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Setup Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Start backend server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- System Health Endpoint: [http://localhost:8000/system/status](http://localhost:8000/system/status)

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
- Web Application: [http://localhost:5173/](http://localhost:5173/)

---

## Running the Automated Test Suite

```bash
source .venv/bin/activate
pytest tests -v
```

Tests include:
- `tests/unit/test_hardened_pipeline.py`: Provenance contracts, task telemetry classification, missing modality masking, quality gating, and determinism.
- `tests/unit/test_quality_engine.py`: Physiological plausibility, stream gaps, missing modalities.
- `tests/unit/test_feature_engine.py`: Feature calculation, availability masks, baseline deltas.
- `tests/unit/test_adaptation_policy.py`: Trigger thresholds, cooldown prevention, quality suppression.
- `tests/integration/test_pipeline_vertical_slice.py`: End-to-end vertical slice (Provider $\rightarrow$ Review).
- `tests/api/test_api_endpoints.py`: All FastAPI REST routes, telemetry ingestion, and schema contracts.

---

## Data Provenance Architecture

Flowstate rigorously separates data origins across all ingestion, storage, feature, and inference layers:

| Provenance Class (`SourceType`) | Real/Simulated | Origin & Physical Boundary | Example Stream |
| :--- | :--- | :--- | :--- |
| `COMPUTER_BEHAVIOR` | **Real Live Telemetry** | Browser/UI interaction telemetry during cognitive tasks | Question latency, error rate, retry count |
| `REAL_WEARABLE` | **Real Live Telemetry** | Physical consumer smartwatch / BLE heart-rate monitor | Bluetooth GATT Heart Rate (0x180D), RR intervals |
| `SIMULATED` | **Simulated** | Synthetic scenario generator with reproducible seed | 5-phase deterministic demo scenario |
| `IMPORTED` | **Historical Benchmark** | Offline CSV/JSON open-science research datasets | Uploaded experimental session traces |
| `SELF_REPORT` | **Subjective Input** | User-entered Likert/NASA-TLX self-assessments | Periodic cognitive workload ratings |
| `DERIVED` | **Computed Metrics** | Pipeline windows, feature vectors, baseline deltas | 30s sliding window features |

> [!IMPORTANT]
> **Task Telemetry Integrity**: Interactive mental-arithmetic telemetry is strictly classified as `COMPUTER_BEHAVIOR` with device identifier `"Flowstate Computer Interaction Telemetry"`. It is never conflated with wearable data.

---

## Scientific Evaluation Disclosures & Open-Science Benchmarking

1. **Evaluation Status**: Flowstate marks its benchmark evaluation status as `VALIDATION_PENDING (Construct Mapping Required)`.
2. **WESAD Dataset Reference**: The 15-subject WESAD (*Wearable Stress and Affect Detection*) dataset provides experimental condition annotations (*Baseline, Stress, Amusement, Meditation*) derived from its formal study protocol, accompanied by reference chest ECG, EDA, and wrist sensor signals.
3. **No Construct Conflation**: WESAD stress annotations cannot be directly equated to Flowstate's three cognitive constructs (*Estimated Workload, Estimated Fatigue, Estimated Engagement*) without explicit, scientifically justified construct mapping.
4. **Zero Fabricated Metrics**: Current inference utilizes interpretable heuristic baseline models for demonstrable responsiveness. Flowstate does not fabricate F1, ROC-AUC, or MAE figures.

---

## Demonstration Sequences

### Path A: Guaranteed Deterministic Demo
1. Open [http://localhost:5173/](http://localhost:5173/)
2. Click **"Run Guaranteed Deterministic Demo (5-Phases)"**.
3. Watch the system transition through:
   - **Phase 1 (Baseline)**: Stable nominal HR (72 bpm) and reaction times (410 ms).
   - **Phase 2 (Demand Increase)**: Task difficulty escalates, HR trends upward (+12 bpm), latency climbs.
   - **Phase 3 (High Workload)**: Cognitive Workload reaches `HIGH` (>85%), confidence reaches `88%`.
   - **Phase 4 (Intervention)**: Flowstate offers a bounded recovery action (`SUGGEST_SHORT_BREAK`).
   - **Phase 5 (Recovery)**: Pacing eases, HR and response times normalize.
4. Click **"Follow this Signal"** on any point to inspect the 7-step backward trace.

### Path B: Live Reviewer Session (Interactive Cognitive Task)
1. Switch to the **"Interactive Task"** tab.
2. Solve the adaptive mental arithmetic problems under time pressure.
3. Observe real response latencies, accuracy, and task difficulty streamed live into the pipeline (tagged as `COMPUTER_BEHAVIOR`).
4. When high workload is sustained, observe the adaptive recommendation banner appear directly in the interface.
5. Click **"Accept"** to experience the automatic difficulty relaxation or recovery pause.
