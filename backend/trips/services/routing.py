"""Road routing between trip waypoints.

Real mode calls the public OSRM demo server (free, no API key). Mock mode
synthesizes great-circle routes so the app and e2e tests work offline.
"""
from __future__ import annotations

import requests
from django.conf import settings

from .geo import haversine_miles

OSRM_URL = "https://router.project-osrm.org/route/v1/driving/"
METERS_PER_MILE = 1609.344
MOCK_ROAD_FACTOR = 1.18  # straight-line to road-distance inflation
MOCK_AVG_SPEED_MPH = 55.0


class RoutingError(Exception):
    pass


def _mock_route(points: list[dict]) -> dict:
    geometry: list[list[float]] = []
    legs = []
    for start, end in zip(points, points[1:]):
        miles = (
            haversine_miles(start["lat"], start["lon"], end["lat"], end["lon"])
            * MOCK_ROAD_FACTOR
        )
        legs.append(
            {"distance_miles": miles, "duration_hours": miles / MOCK_AVG_SPEED_MPH}
        )
        steps = 64
        for i in range(steps + 1):
            t = i / steps
            point = [
                start["lat"] + (end["lat"] - start["lat"]) * t,
                start["lon"] + (end["lon"] - start["lon"]) * t,
            ]
            if not geometry or geometry[-1] != point:
                geometry.append(point)
    return {
        "distance_miles": sum(leg["distance_miles"] for leg in legs),
        "duration_hours": sum(leg["duration_hours"] for leg in legs),
        "geometry": geometry,
        "legs": legs,
    }


def _osrm_route(points: list[dict]) -> dict:
    coords = ";".join(f"{p['lon']},{p['lat']}" for p in points)
    try:
        response = requests.get(
            f"{OSRM_URL}{coords}",
            params={"overview": "full", "geometries": "geojson", "steps": "false"},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise RoutingError(f"Routing service unavailable: {exc}") from exc
    if data.get("code") != "Ok" or not data.get("routes"):
        raise RoutingError("No drivable route found between these locations.")
    route = data["routes"][0]
    return {
        "distance_miles": route["distance"] / METERS_PER_MILE,
        "duration_hours": route["duration"] / 3600.0,
        "geometry": [[lat, lon] for lon, lat in route["geometry"]["coordinates"]],
        "legs": [
            {
                "distance_miles": leg["distance"] / METERS_PER_MILE,
                "duration_hours": leg["duration"] / 3600.0,
            }
            for leg in route["legs"]
        ],
    }


def get_route(points: list[dict]) -> dict:
    """Route through points [{lat, lon}, ...] in visit order.

    Returns {distance_miles, duration_hours, geometry: [[lat, lon], ...],
    legs: [{distance_miles, duration_hours}, ...]}.
    """
    if len(points) < 2:
        raise RoutingError("At least two waypoints are required.")
    if settings.USE_MOCK_APIS:
        return _mock_route(points)
    return _osrm_route(points)
