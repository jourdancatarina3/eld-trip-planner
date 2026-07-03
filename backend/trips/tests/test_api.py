from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

TRIP_PAYLOAD = {
    "current_location": "Chicago",
    "pickup_location": "St. Louis",
    "dropoff_location": "Dallas",
    "current_cycle_used_hours": 20,
    "start_time": "2026-07-03T08:00:00",
}


@override_settings(USE_MOCK_APIS=True)
class GeocodeApiTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_returns_suggestions(self):
        response = self.client.get("/api/geocode/", {"q": "chi"})
        self.assertEqual(response.status_code, 200)
        names = [item["name"] for item in response.json()]
        self.assertIn("Chicago, IL", names)

    def test_short_query_returns_empty(self):
        response = self.client.get("/api/geocode/", {"q": "c"})
        self.assertEqual(response.json(), [])


@override_settings(USE_MOCK_APIS=True)
class PlanTripApiTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def post(self, **overrides):
        return self.client.post(
            "/api/trips/plan/", {**TRIP_PAYLOAD, **overrides}, format="json"
        )

    def test_plans_trip_with_named_locations(self):
        response = self.post()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(data["summary"]["total_distance_miles"], 800)
        self.assertGreaterEqual(len(data["logs"]), 2)
        self.assertEqual(data["stops"][0]["type"], "trip_start")
        self.assertEqual(data["stops"][-1]["type"], "dropoff")
        for log in data["logs"]:
            self.assertAlmostEqual(sum(log["totals"].values()), 24.0, places=1)

    def test_accepts_coordinate_locations(self):
        response = self.post(
            current_location={"name": "Chicago, IL", "lat": 41.8781, "lon": -87.6298}
        )
        self.assertEqual(response.status_code, 200)

    def test_unknown_location_returns_400(self):
        response = self.post(pickup_location="Zzyzxville Nowhere")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["field"], "pickup_location")

    def test_cycle_hours_validated(self):
        response = self.post(current_cycle_used_hours=80)
        self.assertEqual(response.status_code, 400)
        self.assertIn("current_cycle_used_hours", response.json()["details"])

    def test_missing_field_returns_400(self):
        payload = dict(TRIP_PAYLOAD)
        del payload["dropoff_location"]
        response = self.client.post("/api/trips/plan/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_long_trip_includes_fuel_and_restart(self):
        response = self.post(
            current_location="Los Angeles",
            pickup_location="Las Vegas",
            dropoff_location="New York",
            current_cycle_used_hours=60,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(data["summary"]["fuel_stops"], 0)
        self.assertGreater(data["summary"]["restarts"], 0)
        self.assertGreater(data["summary"]["days"], 3)
