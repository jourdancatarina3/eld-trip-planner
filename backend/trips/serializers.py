from rest_framework import serializers


class LocationField(serializers.Field):
    """Accepts either a free-text place name or {name?, lat, lon}."""

    default_error_messages = {
        "invalid": "Provide a place name or an object with lat and lon.",
        "bad_coords": "Latitude must be within [-90, 90] and longitude within [-180, 180].",
    }

    def to_internal_value(self, data):
        if isinstance(data, str):
            value = data.strip()
            if not value:
                self.fail("invalid")
            return value
        if isinstance(data, dict) and "lat" in data and "lon" in data:
            try:
                lat, lon = float(data["lat"]), float(data["lon"])
            except (TypeError, ValueError):
                self.fail("invalid")
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                self.fail("bad_coords")
            return {"name": str(data.get("name", "")).strip(), "lat": lat, "lon": lon}
        self.fail("invalid")

    def to_representation(self, value):
        return value


class TripRequestSerializer(serializers.Serializer):
    current_location = LocationField()
    pickup_location = LocationField()
    dropoff_location = LocationField()
    current_cycle_used_hours = serializers.FloatField(min_value=0, max_value=70)
    start_time = serializers.DateTimeField(required=False)
