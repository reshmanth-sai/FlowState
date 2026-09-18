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


# WebSocket Connection Manager for Live Streaming to Monitor
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(session_id, set()).add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            dead = set()
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.add(connection)
            for d in dead:
                self.active_connections[session_id].discard(d)


ws_manager = ConnectionManager()


@app.websocket("/ws/session/{session_id}")
async def websocket_session_stream(websocket: WebSocket, session_id: str):
    """WebSocket stream providing real-time cognitive monitor updates."""
    await ws_manager.connect(session_id, websocket)
    try:
        while True:
            # Keep-alive ping/pong or client event messages
            data = await websocket.receive_text()
            # Echo heartbeat
            await websocket.send_json({"type": "PONG", "received": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, websocket)


@app.get("/")
async def root():
    return {
        "project": "Flowstate",
        "description": "A Multimodal, Context-Aware System for Personalized Adaptive Web Interfaces",
        "status": "RUNNING",
        "api_docs": "/docs",
    }
