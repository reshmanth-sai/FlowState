"""Data event ingestion and import API routes for Flowstate.

Complies with Section 17 of Master Specification.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from backend.data_providers.importer import ImportProvider
from backend.domain.models import CanonicalEvent
from backend.sessions.orchestrator import SessionOrchestrator

router = APIRouter(prefix="/data", tags=["data"])
orchestrator = SessionOrchestrator()


class EventBatchRequest(BaseModel):
    events: List[CanonicalEvent]


@router.post("/events", response_model=Dict[str, Any])
async def ingest_canonical_events(req: EventBatchRequest):
    """Ingest a batch of validated canonical events."""
    count = await orchestrator.ingestion_service.ingest_batch(req.events)
    return {"ingested_count": count, "status": "SUCCESS"}


@router.get("/events/{session_id}", response_model=List[CanonicalEvent])
async def get_session_events(
    session_id: str,
    signal_type: Optional[str] = None,
    limit: int = 500,
):
    """Retrieve raw canonical events for signal explorer (returns latest events up to limit)."""
    events = await orchestrator.event_repo.get_events_for_session(
        session_id=session_id, signal_type=signal_type
    )
    if limit and len(events) > limit:
        return events[-limit:]
    return events


@router.post("/upload/{session_id}")
async def upload_dataset_file(session_id: str, file: UploadFile = File(...)):
    """Import CSV or JSON research dataset."""
    content_bytes = await file.read()
    content_str = content_bytes.decode("utf-8")
    ext = file.filename.split(".")[-1].lower() if file.filename else "json"

    importer = ImportProvider(
        raw_content=content_str,
        file_format=ext,
        dataset_name=file.filename or "Uploaded Dataset",
    )
    events = await importer.generate_events(session_id=session_id, start_time=datetime.now(timezone.utc))
    count = await orchestrator.ingestion_service.ingest_batch(events)
    return {"status": "IMPORTED", "filename": file.filename, "events_count": count}
