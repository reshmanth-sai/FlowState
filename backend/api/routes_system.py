"""System health and diagnostic API routes for Flowstate.

Complies with Section 16 & Section 17 of Master Specification.
"""

from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter

from backend.domain.models import SessionStatus
from backend.sessions.orchestrator import SessionOrchestrator
from backend.storage.database import db_manager

router = APIRouter(prefix="/system", tags=["system"])
orchestrator = SessionOrchestrator()


@router.get("/status")
async def get_system_status() -> Dict[str, Any]:
    # Check DB
    db_ok = False
    try:
        conn = db_manager.get_connection()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False

    sessions = await orchestrator.session_repo.list_recent(limit=10)
    active_sessions = [s for s in sessions if s.status == SessionStatus.RUNNING]

    return {
        "status": "OPERATIONAL" if db_ok else "DEGRADED",
        "system_name": "Flowstate Cognitive-Efficiency Platform",
        "version": "1.0.0",
        "storage": {
            "engine": "SQLite (WAL Mode)",
            "connected": db_ok,
            "path": db_manager.db_path,
        },
        "hardware_boundary": {
            "declared_boundary": "Computer + Consumer Smartwatch/Wearable",
            "clinical_ecg": False,
            "eeg_fnirs": False,
            "supported_wearable_signals": ["heart_rate (PPG)", "motion (accelerometer)"],
        },
        "data_source_status": {
            "simulated": "READY (Deterministic seed=42)",
            "imported": "READY (CSV/JSON supported)",
            "real_wearable": "ADAPTER BOUNDARY READY",
        },
        "active_sessions_count": len(active_sessions),
        "recent_sessions_count": len(sessions),
    }
