from datetime import datetime

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import TripRequestSerializer
from .services import geocoding, routing
from .services.geo import cumulative_miles, point_at_fraction, simplify_polyline
from .services.hos import Leg, ScheduleError, schedule_trip
from .services.logs import build_daily_logs

MAX_TRIP_MILES = 8000


class HealthView(APIView):
    def get(self, request):
        return Response({"status": "ok", "mock_apis": settings.USE_MOCK_APIS})


class GeocodeView(APIView):
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 2:
            return Response([])
        return Response(geocoding.search(query, limit=5))


class PlanTripView(APIView):
    def post(self, request):
        serializer = TripRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid trip details.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data

        locations = {}
        for field in ("current_location", "pickup_location", "dropoff_location"):
            value = data[field]
            if isinstance(value, str):
                matches = geocoding.search(value, limit=1)
                if not matches:
                    return Response(
                        {
                            "error": f'Could not find a location matching "{value}".',
                            "field": field,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                locations[field] = matches[0]
            else:
                if not value["name"]:
                    value["name"] = geocoding.nearest_city(value["lat"], value["lon"])
                locations[field] = value

        try:
            route = routing.get_route(
                [
                    locations["current_location"],
                    locations["pickup_location"],
                    locations["dropoff_location"],
                ]
            )
        except routing.RoutingError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        if route["distance_miles"] > MAX_TRIP_MILES:
            return Response(
                {"error": "Trip is too long to plan (over 8,000 miles)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start_time = data.get("start_time") or datetime.now().replace(
            second=0, microsecond=0
        )
        if start_time.tzinfo is not None:
            start_time = start_time.replace(tzinfo=None)

        legs = [
            Leg(leg["distance_miles"], leg["duration_hours"]) for leg in route["legs"]
        ]
        try:
            scheduler = schedule_trip(legs, data["current_cycle_used_hours"], start_time)
        except ScheduleError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        geometry = route["geometry"]
        cum = cumulative_miles(geometry)
        total_miles = max(route["distance_miles"], 1e-6)

        # Named anchors keep the origin/pickup/dropoff labels the user chose;
        # everything between falls back to the nearest bundled city.
        anchors = [
            (0.0, locations["current_location"]["name"]),
            (legs[0].distance_miles, locations["pickup_location"]["name"]),
            (total_miles, locations["dropoff_location"]["name"]),
        ]

        def point_at_mile(mile: float) -> list[float]:
            return point_at_fraction(geometry, cum, mile / total_miles)

        def locate(mile: float) -> str:
            for anchor_mile, name in anchors:
                if abs(mile - anchor_mile) <= 5.0:
                    return name
            lat, lon = point_at_mile(mile)
            return geocoding.nearest_city(lat, lon)

        stops = []
        for stop in scheduler.stops:
            lat, lon = point_at_mile(stop.mile)
            stops.append(
                {
                    "type": stop.type,
                    "label": stop.label,
                    "mile": round(stop.mile, 1),
                    "lat": round(lat, 5),
                    "lon": round(lon, 5),
                    "location_name": locate(stop.mile),
                    "arrival": stop.start.isoformat(),
                    "departure": stop.end.isoformat(),
                    "duration_hours": round(stop.duration_hours, 2),
                }
            )

        logs = build_daily_logs(scheduler, locate)

        stop_counts = {}
        for stop in stops:
            stop_counts[stop["type"]] = stop_counts.get(stop["type"], 0) + 1

        return Response(
            {
                "summary": {
                    "total_distance_miles": round(route["distance_miles"], 1),
                    "driving_hours": round(scheduler.driving_hours, 2),
                    "on_duty_hours": round(scheduler.on_duty_hours, 2),
                    "total_trip_hours": round(
                        (scheduler.end_time - start_time).total_seconds() / 3600.0, 2
                    ),
                    "days": len(logs),
                    "start_time": start_time.isoformat(),
                    "end_time": scheduler.end_time.isoformat(),
                    "fuel_stops": stop_counts.get("fuel", 0),
                    "rest_stops": stop_counts.get("rest", 0),
                    "breaks": stop_counts.get("break", 0),
                    "restarts": stop_counts.get("restart", 0),
                    "cycle_used_input": data["current_cycle_used_hours"],
                    "locations": {
                        "current": locations["current_location"],
                        "pickup": locations["pickup_location"],
                        "dropoff": locations["dropoff_location"],
                    },
                },
                "route": {
                    "geometry": simplify_polyline(geometry),
                    "distance_miles": round(route["distance_miles"], 1),
                    "duration_hours": round(route["duration_hours"], 2),
                },
                "stops": stops,
                "logs": logs,
            }
        )
