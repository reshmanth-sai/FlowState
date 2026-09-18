"""Abstract Data Provider interface for Flowstate.

Section 36 of Specification:
All data providers (Simulator, Importer, WearableAdapter) output CanonicalEvent objects.
No data provider may execute cognitive-state logic or inference; they provide observations only.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional
from datetime import datetime

from backend.domain.models import CanonicalEvent, SourceType


class DataProvider(ABC):
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique identifier for the provider instance."""
        pass

    @property
    @abstractmethod
    def source_type(self) -> SourceType:
        """Type of data source (SIMULATED, IMPORTED, REAL_WEARABLE)."""
        pass

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection or initialize provider stream."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Disconnect and release resources."""
        pass

    @abstractmethod
    async def health(self) -> Dict[str, Any]:
        """Return provider health, connection state, and dropped sample counts."""
        pass

    @abstractmethod
    def capabilities(self) -> Dict[str, Any]:
        """Return supported signal types, sample rates, and resolution."""
        pass

    @abstractmethod
    async def generate_events(
        self, session_id: str, start_time: datetime, duration_seconds: float
    ) -> List[CanonicalEvent]:
        """Generate or read a sequence of canonical events for a given time span."""
        pass
