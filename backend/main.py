"""FastAPI application entry point for Flowstate.

Complies with Master Implementation Specification:
- REST API layer connecting all 20 modules
- SQLite database auto-initialization
- CORS headers for frontend integration
- WebSocket live monitor streaming
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Set

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.routes_adaptation import router as adaptation_router
from backend.api.routes_data import router as data_router
from backend.api.routes_evaluation import router as evaluation_router
from backend.api.routes_inference import router as inference_router
from backend.api.routes_processing import router as processing_router
from backend.api.routes_research import router as research_router
from backend.api.routes_sessions import router as sessions_router
from backend.api.routes_system import router as system_router
from backend.api.routes_tasks import router as tasks_router
from backend.storage.database import db_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure SQLite database schema exists
    db_manager.init_db()
    yield
    # Shutdown: Clean up connections if necessary
    pass


app = FastAPI(
    title="Flowstate API",
    description="A Multimodal, Context-Aware System for Personalized Adaptive Web Interfaces",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(sessions_router)
app.include_router(data_router)
app.include_router(processing_router)
app.include_router(inference_router)
app.include_router(adaptation_router)
app.include_router(tasks_router)
app.include_router(research_router)
app.include_router(system_router)
app.include_router(evaluation_router)


# Mount extension test fixtures for deterministic E2E verification
fixtures_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "extension", "tests", "fixtures")
if os.path.isdir(fixtures_path):
    app.mount("/fixtures", StaticFiles(directory=fixtures_path, html=True), name="fixtures")


from backend.api.websocket_manager import ws_manager
from backend.sessions.orchestrator import SessionOrchestrator

orchestrator_instance = SessionOrchestrator()


@app.websocket("/ws/session/{session_id}")
async def websocket_session_stream(websocket: WebSocket, session_id: str):
    """WebSocket stream providing real-time cognitive monitor updates."""
    await ws_manager.connect(session_id, websocket)
    try:
        # Always send initial live state snapshot on connection
        inferences = await orchestrator_instance.inference_repo.get_timeline_for_session(session_id)
        latest_inf = inferences[-1] if inferences else None
        interventions = await orchestrator_instance.adaptation_engine.get_session_interventions(session_id)
        latest_decision = interventions[-1] if interventions else None
        await websocket.send_json({
            "type": "LIVE_SESSION_INIT",
            "session_id": session_id,
            "latest_inference": latest_inf.model_dump() if latest_inf else None,
            "latest_decision": latest_decision.model_dump() if latest_decision else None,
        })

        while True:
            # Keep-alive ping/pong or client event messages
            data = await websocket.receive_text()
            if data == "PING":
                await websocket.send_json({"type": "PONG"})
            else:
                await websocket.send_json({"type": "ACK", "received": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, websocket)
    except Exception:
        ws_manager.disconnect(session_id, websocket)


@app.websocket("/ws/live")
async def websocket_live_global_stream(websocket: WebSocket):
    """WebSocket stream providing global live monitor updates across all active sessions."""
    await ws_manager.connect_global(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "PING":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        ws_manager.disconnect_global(websocket)
    except Exception:
        ws_manager.disconnect_global(websocket)


@app.get("/")
async def root():
    return {
        "project": "Flowstate",
        "description": "A Multimodal, Context-Aware System for Personalized Adaptive Web Interfaces",
        "status": "RUNNING",
        "api_docs": "/docs",
    }
