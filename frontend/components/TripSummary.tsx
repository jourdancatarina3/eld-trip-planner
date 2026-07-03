"use client";

import type { TripPlan } from "@/lib/types";
import { formatDateTime, formatHours, formatMiles } from "@/lib/format";

function Tile({
  label,
  value,
  detail,
  testId,
}: {
  label: string;
  value: string;
  detail?: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
      data-testid={testId}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>
      {detail && <p className="mt-0.5 truncate text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export default function TripSummary({ plan }: { plan: TripPlan }) {
  const { summary } = plan;
  return (
    <section aria-label="Trip summary">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          testId="summary-distance"
          label="Total distance"
          value={formatMiles(summary.total_distance_miles)}
          detail={`${summary.locations.current.name} → ${summary.locations.dropoff.name}`}
        />
        <Tile
          testId="summary-driving"
          label="Driving time"
          value={formatHours(summary.driving_hours)}
          detail={`${formatHours(summary.on_duty_hours)} total on duty`}
        />
        <Tile
          testId="summary-duration"
          label="Trip duration"
          value={`${summary.days} day${summary.days === 1 ? "" : "s"}`}
          detail={`${formatDateTime(summary.start_time)} → ${formatDateTime(
            summary.end_time
          )}`}
        />
        <Tile
          testId="summary-stops"
          label="Required stops"
          value={String(
            summary.fuel_stops +
              summary.rest_stops +
              summary.breaks +
              summary.restarts
          )}
          detail={[
            summary.rest_stops > 0 && `${summary.rest_stops} rest`,
            summary.fuel_stops > 0 && `${summary.fuel_stops} fuel`,
            summary.breaks > 0 && `${summary.breaks} break`,
            summary.restarts > 0 && `${summary.restarts} restart`,
          ]
            .filter(Boolean)
            .join(" · ") || "None needed"}
        />
      </div>
    </section>
  );
}
