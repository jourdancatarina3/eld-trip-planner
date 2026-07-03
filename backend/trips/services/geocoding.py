"""Location search and nearest-city lookups.

Real mode uses Nominatim (OpenStreetMap, free, no API key). Mock mode — and
the fallback when Nominatim is unreachable — uses the bundled US city
dataset so the app keeps working offline and e2e tests stay deterministic.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import requests
from django.conf import settings

from .geo import haversine_miles

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "eld-trip-planner/1.0 (https://github.com/jourdancatarina3/eld-trip-planner)"
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "us_cities.json"

STATE_ABBREVIATIONS = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
    "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
    "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
    "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
    "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
    "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
}


@lru_cache(maxsize=1)
def _cities() -> list[dict]:
    return json.loads(DATA_PATH.read_text())


def _mock_search(query: str, limit: int) -> list[dict]:
    q = query.strip().lower()
    if not q:
        return []
    starts, contains = [], []
    for city in _cities():
        full = f"{city['name']}, {city['state']}".lower()
        if full.startswith(q) or city["name"].lower().startswith(q):
            starts.append(city)
        elif q in full:
            contains.append(city)
    return [
        {"name": f"{c['name']}, {c['state']}", "lat": c["lat"], "lon": c["lon"]}
        for c in (starts + contains)[:limit]
    ]


def _short_name(item: dict) -> str:
    address = item.get("address", {})
    place = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
        or address.get("county")
        or item.get("display_name", "").split(",")[0]
    )
    state = STATE_ABBREVIATIONS.get(address.get("state", ""), address.get("state", ""))
    return f"{place}, {state}" if state else place


@lru_cache(maxsize=512)
def _nominatim_search(query: str, limit: int) -> tuple[dict, ...]:
    response = requests.get(
        NOMINATIM_URL,
        params={
            "q": query,
            "format": "jsonv2",
            "limit": limit,
            "countrycodes": "us",
            "addressdetails": 1,
        },
        headers={"User-Agent": USER_AGENT},
        timeout=10,
    )
    response.raise_for_status()
    return tuple(
        {"name": _short_name(item), "lat": float(item["lat"]), "lon": float(item["lon"])}
        for item in response.json()
    )


def search(query: str, limit: int = 5) -> list[dict]:
    """Return location suggestions as [{name, lat, lon}]."""
    if settings.USE_MOCK_APIS:
        return _mock_search(query, limit)
    try:
        return list(_nominatim_search(query.strip(), limit))
    except requests.RequestException:
        return _mock_search(query, limit)


def nearest_city(lat: float, lon: float) -> str:
    """Name of the bundled city closest to a point, e.g. 'Amarillo, TX'."""
    best = min(_cities(), key=lambda c: haversine_miles(lat, lon, c["lat"], c["lon"]))
    return f"{best['name']}, {best['state']}"
