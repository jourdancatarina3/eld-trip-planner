"""Build per-day FMCSA driver's daily log sheets from scheduled segments.

Each calendar day of the trip becomes one log sheet: duty segments clipped
to the 24-hour grid, per-status totals (always summing to 24 hours), miles
driven, remarks at every change of duty status, and a 70hr/8day recap.
"""
from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Callable

from .hos import CYCLE_LIMIT_HOURS, DRIVING, HOSScheduler, OFF_DUTY, ON_DUTY, SLEEPER_BERTH, Segment

STATUSES = (OFF_DUTY, SLEEPER_BERTH, DRIVING, ON_DUTY)


def _merge_segments(segments: list[Segment]) -> list[Segment]:
    merged: list[Segment] = []
    for seg in segments:
        if merged and merged[-1].status == seg.status and merged[-1].end == seg.start:
            prev = merged[-1]
            merged[-1] = Segment(
                prev.status, prev.start, seg.end, prev.label, prev.start_mile, seg.end_mile
            )
        else:
            merged.append(seg)
    return merged


def _pad_segments(segments: list[Segment]) -> list[Segment]:
    """Add off-duty padding from midnight to trip start and trip end to midnight."""
    padded = list(segments)
    first, last = segments[0], segments[-1]
    day_start = datetime.combine(first.start.date(), time.min)
    if first.start > day_start:
        padded.insert(
            0,
            Segment(OFF_DUTY, day_start, first.start, "Off duty", first.start_mile, first.start_mile),
        )
    day_end = datetime.combine(last.end.date(), time.min) + timedelta(days=1)
    if last.end < day_end:
        padded.append(
            Segment(OFF_DUTY, last.end, day_end, "Off duty", last.end_mile, last.end_mile)
        )
    return _merge_segments(padded)


def _hours_from(day_start: datetime, moment: datetime) -> float:
    return (moment - day_start).total_seconds() / 3600.0


def build_daily_logs(scheduler: HOSScheduler, locate: Callable[[float], str]) -> list[dict]:
    """locate(mile) -> human location name for remarks and headers."""
    segments = _pad_segments(_merge_segments(scheduler.segments))
    trip_start, trip_end = segments[0].start, segments[-1].end

    logs = []
    day_count = (trip_end.date() - trip_start.date()).days + 1
    if segments[-1].end == datetime.combine(trip_end.date(), time.min):
        day_count -= 1  # trip ends exactly at midnight; no extra empty day

    for day_index in range(day_count):
        day_date = trip_start.date() + timedelta(days=day_index)
        day_start = datetime.combine(day_date, time.min)
        day_end = day_start + timedelta(days=1)

        entries = []
        remarks = []
        totals = {status: 0.0 for status in STATUSES}
        miles_today = 0.0
        start_mile_of_day = None
        end_mile_of_day = None

        for seg in segments:
            if seg.end <= day_start or seg.start >= day_end:
                continue
            clip_start = max(seg.start, day_start)
            clip_end = min(seg.end, day_end)
            hours = _hours_from(day_start, clip_end) - _hours_from(day_start, clip_start)
            if hours <= 0:
                continue
            fraction = hours / seg.hours if seg.hours > 0 else 0.0
            seg_miles = seg.miles * fraction
            mile_at_clip_start = seg.start_mile + seg.miles * (
                (clip_start - seg.start).total_seconds() / 3600.0 / seg.hours
                if seg.hours > 0
                else 0.0
            )
            if start_mile_of_day is None:
                start_mile_of_day = mile_at_clip_start
            end_mile_of_day = mile_at_clip_start + seg_miles

            entries.append(
                {
                    "status": seg.status,
                    "start_hour": round(_hours_from(day_start, clip_start), 4),
                    "end_hour": round(_hours_from(day_start, clip_end), 4),
                    "label": seg.label,
                    "location": locate(mile_at_clip_start),
                }
            )
            totals[seg.status] += hours
            miles_today += seg_miles

            # Remarks are recorded at each change of duty status, i.e. where
            # the segment truly begins (not at a midnight continuation).
            if seg.start >= day_start and seg.label != "Off duty":
                remarks.append(
                    {
                        "hour": round(_hours_from(day_start, seg.start), 4),
                        "location": locate(seg.start_mile),
                        "note": seg.label,
                    }
                )

        cycle_used = scheduler.cycle_used_at(min(day_end, trip_end))
        logs.append(
            {
                "date": day_date.isoformat(),
                "day_number": day_index + 1,
                "entries": entries,
                "totals": {status: round(totals[status], 2) for status in STATUSES},
                "total_miles": round(miles_today, 1),
                "from_location": locate(start_mile_of_day or 0.0),
                "to_location": locate(end_mile_of_day or 0.0),
                "remarks": remarks,
                "recap": {
                    "on_duty_today": round(totals[DRIVING] + totals[ON_DUTY], 2),
                    "cycle_used": round(cycle_used, 2),
                    "cycle_available_tomorrow": round(
                        max(CYCLE_LIMIT_HOURS - cycle_used, 0.0), 2
                    ),
                },
            }
        )
    return logs
