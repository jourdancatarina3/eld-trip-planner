import type { StopType } from "./types";

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
