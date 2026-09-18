"""Synchronization and Windowing Engine for Flowstate.

Complies with Section 6 (M07 & M08) & Section 9 of Master Specification:
- Aligns heterogeneous asynchronous event streams (wearable, task telemetry) to common analysis windows.
- Generates sliding analysis windows (e.g. 30s duration, 15s step).
- Strictly prevents look-ahead leakage: windows are indexed strictly by their chronological bounds.
- Emits SignalWindow models paired with window-specific event slices.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from backend.domain.models import CanonicalEvent, SignalWindow
from backend.quality.engine import DataQualityEngine


class SynchronizationEngine:
    def __init__(
        self,
        window_duration_seconds: float = 30.0,
        step_seconds: float = 15.0,
        quality_engine: Optional[DataQualityEngine] = None,
    ):
        self.window_duration_seconds = window_duration_seconds
        self.step_seconds = step_seconds
        self.quality_engine = quality_engine or DataQualityEngine()

    def create_sliding_windows(
        self,
        session_id: str,
        events: List[CanonicalEvent],
        session_start_time: Optional[datetime] = None,
    ) -> List[Tuple[SignalWindow, List[CanonicalEvent]]]:
        """Slice session events into synchronized sliding windows."""
        if not events:
            return []

        # Deduplicate and sort chronologically
        sorted_events = self.quality_engine.deduplicate_events(events)
        sorted_events.sort(key=lambda e: e.timestamp)

        first_ts = session_start_time or sorted_events[0].timestamp
        last_ts = sorted_events[-1].timestamp

        total_span = (last_ts - first_ts).total_seconds()
        if total_span < self.window_duration_seconds:
            # We still form at least one window if events exist
            win_end = first_ts + timedelta(seconds=self.window_duration_seconds)
            window_bounds = [(first_ts, win_end)]
        else:
            window_bounds = []
            curr_start = first_ts
            while curr_start + timedelta(seconds=self.window_duration_seconds) <= last_ts + timedelta(seconds=1.0):
                curr_end = curr_start + timedelta(seconds=self.window_duration_seconds)
                window_bounds.append((curr_start, curr_end))
                curr_start += timedelta(seconds=self.step_seconds)

        results: List[Tuple[SignalWindow, List[CanonicalEvent]]] = []

        for win_start, win_end in window_bounds:
            # Slice events falling strictly inside this window [win_start, win_end)
            win_events = [
                e for e in sorted_events
                if win_start <= e.timestamp < win_end
            ]

            # Quality report for this window
            q_report = self.quality_engine.evaluate_window_quality(
                win_events, window_duration_seconds=self.window_duration_seconds
            )

            # Event counts by signal type
            counts: Dict[str, int] = {}
            for e in win_events:
                sig_name = e.signal_type.value
                counts[sig_name] = counts.get(sig_name, 0) + 1

            win_model = SignalWindow(
                window_id=f"win_{session_id}_{int(win_start.timestamp())}",
                session_id=session_id,
                start_time=win_start,
                end_time=win_end,
                duration_seconds=self.window_duration_seconds,
                completeness=q_report.completeness,
                quality_summary=q_report.quality_summary,
                event_counts=counts,
            )

            results.append((win_model, win_events))

        return results
