"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Stop, StopType, TripPlan } from "@/lib/types";
import { formatDateTime, formatHours } from "@/lib/format";

export const STOP_STYLES: Record<
  StopType,
  { color: string; glyph: string; name: string }
> = {
  trip_start: { color: "var(--stop-trip-start)", glyph: "S", name: "Trip start" },
  pickup: { color: "var(--stop-pickup)", glyph: "P", name: "Pickup" },
  dropoff: { color: "var(--stop-dropoff)", glyph: "D", name: "Dropoff" },
  fuel: { color: "var(--stop-fuel)", glyph: "F", name: "Fuel stop" },
  break: { color: "var(--stop-break)", glyph: "B", name: "30-min break" },
  rest: { color: "var(--stop-rest)", glyph: "R", name: "10-hr rest" },
  restart: { color: "var(--stop-restart)", glyph: "34", name: "34-hr restart" },
};

function stopIcon(type: StopType): L.DivIcon {
  const style = STOP_STYLES[type];
  return L.divIcon({
    className: "",
    html: `<div class="stop-marker" style="background:${style.color}">${style.glyph}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function FitToRoute({ geometry }: { geometry: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (geometry.length > 1) {
      map.fitBounds(L.latLngBounds(geometry), { padding: [32, 32] });
    }
  }, [map, geometry]);
  return null;
}

function StopPopup({ stop }: { stop: Stop }) {
  const style = STOP_STYLES[stop.type];
  return (
    <div className="min-w-44 text-[13px] leading-snug">
      <p className="font-semibold text-slate-900">{style.name}</p>
      <p className="text-slate-600">{stop.location_name}</p>
      <p className="mt-1 text-slate-500">
        {formatDateTime(stop.arrival)}
        {stop.duration_hours > 0 && <> · {formatHours(stop.duration_hours)}</>}
      </p>
      <p className="text-slate-400">Mile {Math.round(stop.mile)}</p>
    </div>
  );
}

export default function RouteMapInner({ plan }: { plan: TripPlan }) {
  const geometry = plan.route.geometry;
  return (
    <MapContainer
      center={geometry[0] ?? [39, -96]}
      zoom={5}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToRoute geometry={geometry} />
      <Polyline
        positions={geometry}
        pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9 }}
      />
      <Polyline
        positions={geometry}
        pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 0.95 }}
      />
      {plan.stops.map((stop, index) => (
        <Marker
          key={`${stop.type}-${index}`}
          position={[stop.lat, stop.lon]}
          icon={stopIcon(stop.type)}
        >
          <Popup>
            <StopPopup stop={stop} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
