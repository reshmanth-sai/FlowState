"""Event Ingestion Service for Flowstate.

Complies with Section 6 (M05) & Section 8 of Master Specification:
- Accepts canonical time-stamped events with provenance.
- Enforces data integrity, physiological plausibility, and session validation.
- Persists events via EventRepository.
- Dispatches events to the active synchronization buffer.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone

from backend.domain.models import CanonicalEvent, SignalType
from backend.domain.repositories import EventRepository, SessionRepository
from backend.storage.sqlite_repo import SQLiteEventRepository, SQLiteSessionRepository

logger = logging.getLogger("flowstate.ingestion")


class IngestionService:
    def __init__(
        self,
        event_repo: Optional[EventRepository] = None,
        session_repo: Optional[SessionRepository] = None,
    ):
        self.event_repo = event_repo or SQLiteEventRepository()
        self.session_repo = session_repo or SQLiteSessionRepository()
        # In-memory sliding buffer for real-time windowing: session_id -> List[CanonicalEvent]
        self._live_buffers: Dict[str, List[CanonicalEvent]] = {}

    def _validate_event(self, event: CanonicalEvent) -> bool:
        # Physiological plausibility check for heart rate
        if event.signal_type == SignalType.HEART_RATE:
            try:
                val = float(event.value)
                if val < 30.0 or val > 240.0:
                    logger.warning(f"Rejecting implausible heart rate: {val} bpm (event {event.id})")
                    return False
            except (ValueError, TypeError):
                return False

        # Ensure quality is in [0, 1]
        if event.quality < 0.0 or event.quality > 1.0:
            return False

        return True

    async def ingest_event(self, event: CanonicalEvent) -> Optional[CanonicalEvent]:
        """Ingest a single canonical event."""
        if not self._validate_event(event):
            return None

        # Verify session exists
        session = await self.session_repo.get_by_id(event.session_id)
        if not session:
            logger.warning(f"Cannot ingest event for non-existent session: {event.session_id}")
            return None

        # Persist to database
        saved_event = await self.event_repo.add_event(event)

        # Append to live buffer (bounded to last 500 events to prevent memory leak)
        buf = self._live_buffers.setdefault(event.session_id, [])
        buf.append(saved_event)
        if len(buf) > 500:
            self._live_buffers[event.session_id] = buf[-500:]

        return saved_event

    async def ingest_batch(self, events: List[CanonicalEvent]) -> int:
        """Ingest a batch of canonical events with validation."""
        valid_events = [e for e in events if self._validate_event(e)]
        if not valid_events:
            return 0

        count = await self.event_repo.add_events_batch(valid_events)
        for ev in valid_events:
            buf = self._live_buffers.setdefault(ev.session_id, [])
            buf.append(ev)
            if len(buf) > 500:
                self._live_buffers[ev.session_id] = buf[-500:]

        return count

    def get_live_buffer(self, session_id: str) -> List[CanonicalEvent]:
        """Retrieve recent events from the in-memory buffer."""
        return list(self._live_buffers.get(session_id, []))

    def clear_buffer(self, session_id: str) -> None:
        """Clear memory buffer when session closes."""
        self._live_buffers.pop(session_id, None)
