"""FMCSA hours-of-service scheduler for property-carrying drivers.

Simulates a trip minute-by-minute against the 49 CFR 395.3 limits the
assessment specifies (70hr/8day cycle, no adverse driving conditions):

- 11 hours driving max within a 14-hour on-duty window; the window opens
  with the first on-duty activity after 10+ consecutive hours off duty and
  is not extended by breaks.
- 30-minute break required after 8 cumulative hours of driving; any
  non-driving period of 30+ minutes (fuel stop, pickup, rest) satisfies it.
- 70-hour/8-day rolling on-duty cycle; a 34-hour restart resets it. Only
  driving is barred once a limit is hit — non-driving on-duty work (pickup,
  drop-off, fueling) remains legal past the 14-hour and 70-hour marks.
- Fuel stop (30 min, on duty) at least every 1,000 miles.
- 1 hour on duty for pickup and 1 hour for drop-off.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

OFF_DUTY = "off_duty"
SLEEPER_BERTH = "sleeper_berth"
DRIVING = "driving"
ON_DUTY = "on_duty"

MAX_DRIVING_HOURS = 11.0
MAX_WINDOW_HOURS = 14.0
DRIVING_LIMIT_BEFORE_BREAK = 8.0
BREAK_HOURS = 0.5
DAILY_REST_HOURS = 10.0
CYCLE_LIMIT_HOURS = 70.0
CYCLE_WINDOW_DAYS = 8
RESTART_HOURS = 34.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_HOURS = 0.5
PICKUP_HOURS = 1.0
DROPOFF_HOURS = 1.0

EPS = 1e-6


class ScheduleError(Exception):
    pass


@dataclass
class Leg:
    distance_miles: float
    duration_hours: float

    @property
    def speed_mph(self) -> float:
        return 0.0 if self.duration_hours <= EPS else self.distance_miles / self.duration_hours


@dataclass
class Segment:
    status: str
    start: datetime
    end: datetime
    label: str
    start_mile: float
    end_mile: float

    @property
    def hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600.0

    @property
    def miles(self) -> float:
        return self.end_mile - self.start_mile


@dataclass
class Stop:
    type: str
    label: str
    mile: float
    start: datetime
    end: datetime

    @property
    def duration_hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600.0


class HOSScheduler:
    def __init__(self, legs: list[Leg], cycle_used_hours: float, start_time: datetime):
        self.legs = legs
        self.start_time = start_time
        self.now = start_time
        self.window_start: datetime | None = None
        self.driving_in_window = 0.0
        self.driving_since_break = 0.0
        self.miles_since_fuel = 0.0
        self.mile = 0.0
        self.segments: list[Segment] = []
        self.stops: list[Stop] = []
        # On-duty intervals feed the rolling 8-day total. Prior cycle use is
        # seeded as a synthetic on-duty block ending at the trip start.
        self.on_duty_intervals: list[tuple[datetime, datetime]] = []
        self.restart_ends: list[datetime] = []
        if cycle_used_hours > 0:
            self.on_duty_intervals.append(
                (start_time - timedelta(hours=cycle_used_hours), start_time)
            )

    # ------------------------------------------------------------------
    # Clock helpers
    # ------------------------------------------------------------------
    def cycle_used_at(self, at: datetime) -> float:
        """On-duty hours counting toward the 70hr limit at a moment in time."""
        cutoff = at - timedelta(days=CYCLE_WINDOW_DAYS)
        for end in self.restart_ends:
            if end <= at and end > cutoff:
                cutoff = end
        total = 0.0
        for start, end in self.on_duty_intervals:
            lo, hi = max(start, cutoff), min(end, at)
            if hi > lo:
                total += (hi - lo).total_seconds() / 3600.0
        return total

    def cycle_left(self) -> float:
        return CYCLE_LIMIT_HOURS - self.cycle_used_at(self.now)

    def window_left(self) -> float:
        if self.window_start is None:
            return MAX_WINDOW_HOURS
        elapsed = (self.now - self.window_start).total_seconds() / 3600.0
        return MAX_WINDOW_HOURS - elapsed

    def drive_left_in_window(self) -> float:
        return MAX_DRIVING_HOURS - self.driving_in_window

    # ------------------------------------------------------------------
    # Duty-status events
    # ------------------------------------------------------------------
    def _add_segment(self, status: str, hours: float, label: str, miles: float = 0.0):
        start = self.now
        end = start + timedelta(hours=hours)
        self.segments.append(
            Segment(status, start, end, label, self.mile, self.mile + miles)
        )
        self.now = end
        self.mile += miles
        return start, end

    def _record_stop(self, type_: str, label: str, start: datetime, end: datetime):
        self.stops.append(Stop(type_, label, self.mile, start, end))

    def _open_window(self):
        if self.window_start is None:
            self.window_start = self.now

    def _reset_window(self):
        self.window_start = None
        self.driving_in_window = 0.0
        self.driving_since_break = 0.0

    def take_break(self):
        start, end = self._add_segment(OFF_DUTY, BREAK_HOURS, "30-min break")
        self._record_stop("break", "30-min rest break", start, end)
        self.driving_since_break = 0.0

    def take_fuel_stop(self):
        self._open_window()
        start, end = self._add_segment(ON_DUTY, FUEL_STOP_HOURS, "Fueling")
        self._record_stop("fuel", "Fuel stop", start, end)
        self.on_duty_intervals.append((start, end))
        self.miles_since_fuel = 0.0
        self.driving_since_break = 0.0

    def take_daily_rest(self):
        start, end = self._add_segment(SLEEPER_BERTH, DAILY_REST_HOURS, "10-hr rest")
        self._record_stop("rest", "10-hr rest", start, end)
        self._reset_window()

    def take_restart(self):
        start, end = self._add_segment(OFF_DUTY, RESTART_HOURS, "34-hr restart")
        self._record_stop("restart", "34-hr cycle restart", start, end)
        self.restart_ends.append(end)
        self._reset_window()

    def do_service(self, type_: str, label: str, hours: float):
        self._open_window()
        start, end = self._add_segment(ON_DUTY, hours, label)
        self._record_stop(type_, label, start, end)
        self.on_duty_intervals.append((start, end))
        if hours >= BREAK_HOURS:
            self.driving_since_break = 0.0

    # ------------------------------------------------------------------
    # Driving
    # ------------------------------------------------------------------
    def drive_leg(self, leg: Leg):
        remaining = leg.duration_hours
        speed = leg.speed_mph
        guard = 0
        while remaining > EPS:
            guard += 1
            if guard > 10000:
                raise ScheduleError("Trip could not be scheduled within HOS limits.")
            if self.cycle_left() <= EPS:
                self.take_restart()
                continue
            w_left = self.window_left()
            d_left = self.drive_left_in_window()
            if w_left <= EPS or d_left <= EPS:
                self.take_daily_rest()
                continue
            if self.driving_since_break >= DRIVING_LIMIT_BEFORE_BREAK - EPS:
                # No point breaking if the window can't fit the break plus
                # any further driving — rest instead.
                if w_left > BREAK_HOURS + EPS:
                    self.take_break()
                else:
                    self.take_daily_rest()
                continue
            if self.miles_since_fuel >= FUEL_INTERVAL_MILES - EPS:
                self.take_fuel_stop()
                continue
            chunk = min(
                remaining,
                d_left,
                w_left,
                DRIVING_LIMIT_BEFORE_BREAK - self.driving_since_break,
                self.cycle_left(),
            )
            if speed > 0:
                chunk = min(chunk, (FUEL_INTERVAL_MILES - self.miles_since_fuel) / speed)
            self._open_window()
            start, end = self._add_segment(DRIVING, chunk, "Driving", miles=chunk * speed)
            self.on_duty_intervals.append((start, end))
            self.driving_in_window += chunk
            self.driving_since_break += chunk
            self.miles_since_fuel += chunk * speed
            remaining -= chunk

    # ------------------------------------------------------------------
    # Trip assembly
    # ------------------------------------------------------------------
    def plan(self):
        self._record_stop("trip_start", "Trip start", self.now, self.now)
        for index, leg in enumerate(self.legs):
            self.drive_leg(leg)
            if index < len(self.legs) - 1:
                self.do_service("pickup", "Pickup", PICKUP_HOURS)
        self.do_service("dropoff", "Drop-off", DROPOFF_HOURS)
        return self

    # ------------------------------------------------------------------
    # Results
    # ------------------------------------------------------------------
    @property
    def end_time(self) -> datetime:
        return self.now

    @property
    def driving_hours(self) -> float:
        return sum(s.hours for s in self.segments if s.status == DRIVING)

    @property
    def on_duty_hours(self) -> float:
        return sum(s.hours for s in self.segments if s.status in (DRIVING, ON_DUTY))


def schedule_trip(
    legs: list[Leg], cycle_used_hours: float, start_time: datetime
) -> HOSScheduler:
    scheduler = HOSScheduler(legs, cycle_used_hours, start_time)
    return scheduler.plan()
