from datetime import datetime

from django.test import SimpleTestCase

from trips.services.hos import (
    DRIVING,
    FUEL_INTERVAL_MILES,
    Leg,
    OFF_DUTY,
    ON_DUTY,
    SLEEPER_BERTH,
    schedule_trip,
)
from trips.services.logs import build_daily_logs

from .compliance import find_violations

START = datetime(2026, 7, 3, 8, 0)


def plan(distance_miles, duration_hours, cycle_used=0.0, first_leg=(40.0, 0.75)):
    legs = [Leg(*first_leg), Leg(distance_miles, duration_hours)]
    return schedule_trip(legs, cycle_used, START)


class SchedulerComplianceTests(SimpleTestCase):
    def assert_compliant(self, scheduler, cycle_used):
        violations = find_violations(scheduler.segments, cycle_used)
        self.assertEqual(violations, [])

    def test_short_trip_fits_one_window(self):
        scheduler = plan(300, 5.0)
        self.assert_compliant(scheduler, 0)
        # 0.75 + 5.0 driving, 1h pickup, 1h dropoff, no rests needed
        self.assertAlmostEqual(scheduler.driving_hours, 5.75, places=2)
        self.assertEqual([s for s in scheduler.stops if s.type == "rest"], [])
        self.assertEqual(scheduler.end_time, datetime(2026, 7, 3, 15, 45))

    def test_break_inserted_after_eight_hours_driving(self):
        scheduler = plan(600, 10.0)
        self.assert_compliant(scheduler, 0)
        breaks = [s for s in scheduler.stops if s.type == "break"]
        self.assertEqual(len(breaks), 1)

    def test_rest_inserted_when_driving_limit_reached(self):
        scheduler = plan(800, 13.0)
        self.assert_compliant(scheduler, 0)
        rests = [s for s in scheduler.stops if s.type == "rest"]
        self.assertEqual(len(rests), 1)
        self.assertAlmostEqual(rests[0].duration_hours, 10.0, places=2)

    def test_fuel_stop_every_thousand_miles(self):
        scheduler = plan(2460, 41.0)
        self.assert_compliant(scheduler, 0)
        fuel_stops = [s for s in scheduler.stops if s.type == "fuel"]
        self.assertEqual(len(fuel_stops), int(scheduler.mile // FUEL_INTERVAL_MILES))
        for stop in fuel_stops:
            self.assertAlmostEqual(stop.mile % FUEL_INTERVAL_MILES, 0.0, places=3)

    def test_restart_taken_when_cycle_exhausted(self):
        scheduler = plan(1200, 20.0, cycle_used=65.0)
        self.assert_compliant(scheduler, 65.0)
        restarts = [s for s in scheduler.stops if s.type == "restart"]
        self.assertEqual(len(restarts), 1)
        self.assertAlmostEqual(restarts[0].duration_hours, 34.0, places=2)

    def test_cross_country_trip_is_compliant(self):
        scheduler = plan(2790, 41.5, cycle_used=30.0, first_leg=(60.0, 1.2))
        self.assert_compliant(scheduler, 30.0)
        self.assertAlmostEqual(scheduler.mile, 2850.0, places=1)

    def test_zero_distance_first_leg(self):
        scheduler = plan(500, 8.0, first_leg=(0.0, 0.0))
        self.assert_compliant(scheduler, 0)
        self.assertEqual(scheduler.stops[1].type, "pickup")

    def test_full_cycle_used_forces_restart_before_driving(self):
        scheduler = plan(300, 5.0, cycle_used=70.0)
        self.assert_compliant(scheduler, 70.0)
        self.assertEqual(scheduler.segments[0].label, "34-hr restart")

    def test_schedule_is_continuous(self):
        scheduler = plan(1500, 24.0, cycle_used=10.0)
        for prev, cur in zip(scheduler.segments, scheduler.segments[1:]):
            self.assertEqual(prev.end, cur.start)


class DailyLogTests(SimpleTestCase):
    def build(self, scheduler):
        return build_daily_logs(scheduler, locate=lambda mile: f"Mile {mile:.0f}")

    def test_each_day_totals_24_hours(self):
        logs = self.build(plan(2790, 41.5, cycle_used=30.0))
        self.assertGreater(len(logs), 3)
        for log in logs:
            self.assertAlmostEqual(sum(log["totals"].values()), 24.0, places=2)

    def test_first_day_padded_with_off_duty_before_start(self):
        logs = self.build(plan(300, 5.0))
        first_entry = logs[0]["entries"][0]
        self.assertEqual(first_entry["status"], OFF_DUTY)
        self.assertEqual(first_entry["start_hour"], 0.0)
        self.assertEqual(first_entry["end_hour"], 8.0)

    def test_last_day_padded_with_off_duty_after_dropoff(self):
        logs = self.build(plan(300, 5.0))
        last_entry = logs[-1]["entries"][-1]
        self.assertEqual(last_entry["status"], OFF_DUTY)
        self.assertEqual(last_entry["end_hour"], 24.0)

    def test_day_miles_sum_to_trip_miles(self):
        scheduler = plan(2790, 41.5, cycle_used=30.0)
        logs = self.build(scheduler)
        self.assertAlmostEqual(
            sum(log["total_miles"] for log in logs), scheduler.mile, delta=1.0
        )

    def test_statuses_are_known(self):
        logs = self.build(plan(1200, 20.0, cycle_used=65.0))
        valid = {OFF_DUTY, SLEEPER_BERTH, DRIVING, ON_DUTY}
        for log in logs:
            for entry in log["entries"]:
                self.assertIn(entry["status"], valid)

    def test_remarks_present_at_duty_changes(self):
        logs = self.build(plan(800, 13.0))
        notes = [r["note"] for log in logs for r in log["remarks"]]
        self.assertIn("Pickup", notes)
        self.assertIn("Drop-off", notes)
        self.assertIn("10-hr rest", notes)

    def test_recap_tracks_cycle(self):
        logs = self.build(plan(800, 13.0, cycle_used=20.0))
        first = logs[0]["recap"]
        self.assertGreater(first["cycle_used"], 20.0)
        self.assertAlmostEqual(
            first["cycle_available_tomorrow"], 70.0 - first["cycle_used"], places=2
        )
