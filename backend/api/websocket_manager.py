"""WebSocket connection manager for Flowstate real-time live streaming.

Provides session-scoped subscription management and thread-safe asynchronous
broadcasting for live cognitive telemetry, state inferences, and adaptation decisions.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Set
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder

logger = logging.getLogger("flowstate.websocket")


class ConnectionManager:
    """Manages active WebSocket connections grouped by session ID."""

    def __init__(self) -> None:
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.global_connections: Set[WebSocket] = set()

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """Accept incoming WebSocket connection and bind to session."""
        await websocket.accept()
        self.active_connections.setdefault(session_id, set()).add(websocket)
        logger.info(f"[WebSocket] Client connected to session: {session_id}")

    async def connect_global(self, websocket: WebSocket) -> None:
        """Accept incoming WebSocket connection subscribed to all sessions."""
        await websocket.accept()
        self.global_connections.add(websocket)
        logger.info("[WebSocket] Client connected to global monitor stream")

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        """Unregister client connection and clean up empty session sets."""
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        self.global_connections.discard(websocket)
        logger.info(f"[WebSocket] Client disconnected from session: {session_id}")

    def disconnect_global(self, websocket: WebSocket) -> None:
        """Unregister client connection from global stream."""
        self.global_connections.discard(websocket)
        logger.info("[WebSocket] Client disconnected from global monitor stream")

    async def broadcast_to_session(self, session_id: str, message: Dict[str, Any]) -> int:
        """Broadcast JSON message to all clients subscribed to session_id and global."""
        sent_count = 0
        dead_connections: Set[WebSocket] = set()
        encoded_payload = jsonable_encoder(message)

        # 1. Send to session-specific subscribers
        targets = set(self.active_connections.get(session_id, set()))
        # 2. Also send to global subscribers
        targets.update(self.global_connections)

        for connection in targets:
            try:
                await connection.send_json(encoded_payload)
                sent_count += 1
            except Exception as exc:
                logger.debug(f"[WebSocket] Failed to send to connection: {exc}")
                dead_connections.add(connection)

        # Cleanup any disconnected sockets
        for dead in dead_connections:
            if session_id in self.active_connections:
                self.active_connections[session_id].discard(dead)
            self.global_connections.discard(dead)

        logger.debug(f"[WebSocket] Broadcast to session {session_id}: sent to {sent_count} clients (targets: {len(targets)})")
        return sent_count


# Global singleton instance
ws_manager = ConnectionManager()
