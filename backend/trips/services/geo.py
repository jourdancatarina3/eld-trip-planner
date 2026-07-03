"""Geodesic helpers for working with route polylines."""
from __future__ import annotations

import math
from bisect import bisect_left

EARTH_RADIUS_MILES = 3958.7613


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_MILES * math.asin(math.sqrt(a))


def cumulative_miles(points: list[list[float]]) -> list[float]:
    """Cumulative distance along a [lat, lon] polyline."""
    cum = [0.0]
    for i in range(1, len(points)):
        prev, cur = points[i - 1], points[i]
        cum.append(cum[-1] + haversine_miles(prev[0], prev[1], cur[0], cur[1]))
    return cum


def point_at_fraction(
    points: list[list[float]], cum: list[float], fraction: float
) -> list[float]:
    """Point at a fraction (0..1) of the polyline's total length."""
    if not points:
        return [0.0, 0.0]
    if len(points) == 1 or cum[-1] <= 0:
        return list(points[0])
    fraction = min(max(fraction, 0.0), 1.0)
    target = fraction * cum[-1]
    i = bisect_left(cum, target)
    if i <= 0:
        return list(points[0])
    if i >= len(points):
        return list(points[-1])
    span = cum[i] - cum[i - 1]
    t = 0.0 if span <= 0 else (target - cum[i - 1]) / span
    lat = points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t
    lon = points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t
    return [lat, lon]


def simplify_polyline(points: list[list[float]], max_points: int = 600) -> list[list[float]]:
    """Downsample a polyline by stride, always keeping both endpoints."""
    if len(points) <= max_points:
        return points
    stride = (len(points) - 1) / (max_points - 1)
    sampled = [points[round(i * stride)] for i in range(max_points - 1)]
    sampled.append(points[-1])
    return sampled
