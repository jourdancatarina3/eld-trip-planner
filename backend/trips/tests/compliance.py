"""Independent HOS compliance checker used by the scheduler tests.

Walks a list of duty segments and verifies the FMCSA limits directly from
the timeline, without reusing the scheduler's own bookkeeping.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from trips.services.hos import (
    CYCLE_LIMIT_HOURS,
    CYCLE_WINDOW_DAYS,
    DRIVING,
    OFF_DUTY,
    ON_DUTY,
    RESTART_HOURS,
    SLEEPER_BERTH,
    Segment,
)

REST_STATUSES = (OFF_DUTY, SLEEPER_BERTH)


def _hours(delta: timedelta) -> float:
    return delta.total_seconds() / 3600.0


def find_violations(segments: list[Segment], initial_cycle_hours: float) -> list[str]:
    violations: list[str] = []
    tolerance = 1e-6

    # --- 11-hour driving / 14-hour window ------------------------------
    window_start: datetime | None = None
    driving_in_window = 0.0
    rest_run = 0.0  # consecutive off-duty/sleeper hours
    for seg in segments:
        if seg.status in REST_STATUSES:
            rest_run += seg.hours
            continue
        if rest_run >= 10.0 - tolerance or window_start is None:
            window_start = seg.start
            driving_in_window = 0.0
        rest_run = 0.0
        if seg.status == DRIVING:
            end_offset = _hours(seg.end - window_start)
            if end_offset > 14.0 + tolerance:
                violations.append(
                    f"Driving past 14-hour window: segment ending {seg.end} "
                    f"is {end_offset:.2f}h after window start {window_start}"
                )
            driving_in_window += seg.hours
            if driving_in_window > 11.0 + tolerance:
                violations.append(
                    f"More than 11h driving in window starting {window_start}: "
                    f"{driving_in_window:.2f}h"
                )

    # --- 30-minute break after 8h cumulative driving --------------------
    driving_since_break = 0.0
    non_driving_run = 0.0
    for seg in segments:
        if seg.status == DRIVING:
            non_driving_run = 0.0
            driving_since_break += seg.hours
            if driving_since_break > 8.0 + tolerance:
                violations.append(
                    f"{driving_since_break:.2f}h cumulative driving without a "
                    f"30-minute break (segment ending {seg.end})"
                )
        else:
            non_driving_run += seg.hours
            if non_driving_run >= 0.5 - tolerance:
                driving_since_break = 0.0

    # --- 70-hour/8-day rolling cycle with 34-hour restarts ---------------
    if not segments:
        return violations
    trip_start = segments[0].start
    on_duty_intervals = []
    if initial_cycle_hours > 0:
        on_duty_intervals.append(
            (trip_start - timedelta(hours=initial_cycle_hours), trip_start)
        )
    restart_ends: list[datetime] = []
    rest_run_start: datetime | None = None
    off_accum = 0.0
    for seg in segments:
        if seg.status in REST_STATUSES:
            if rest_run_start is None:
                rest_run_start = seg.start
                off_accum = 0.0
            off_accum += seg.hours
            if off_accum >= RESTART_HOURS - tolerance:
                restart_ends.append(seg.end)
        else:
            rest_run_start = None
            off_accum = 0.0
        if seg.status in (DRIVING, ON_DUTY):
            on_duty_intervals.append((seg.start, seg.end))

    def cycle_used_at(at: datetime) -> float:
        cutoff = at - timedelta(days=CYCLE_WINDOW_DAYS)
        for end in restart_ends:
            if end <= at and end > cutoff:
                cutoff = end
        total = 0.0
        for start, end in on_duty_intervals:
            lo, hi = max(start, cutoff), min(end, at)
            if hi > lo:
                total += _hours(hi - lo)
        return total

    for seg in segments:
        if seg.status == DRIVING:
            used_at_end = cycle_used_at(seg.end)
            if used_at_end > CYCLE_LIMIT_HOURS + tolerance:
                violations.append(
                    f"Driving with {used_at_end:.2f}h on duty in cycle "
                    f"(segment ending {seg.end})"
                )

    return violations
