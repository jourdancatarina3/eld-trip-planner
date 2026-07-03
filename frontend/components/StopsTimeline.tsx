"use client";

import type { Stop, TripPlan } from "@/lib/types";
import { STOP_STYLES } from "@/lib/stops";
import { formatDateTime, formatHours } from "@/lib/format";

function TimelineItem({ stop, isLast }: { stop: Stop; isLast: boolean }) {
  const style = STOP_STYLES[stop.type];
  return (
    <li className="relative pb-5 pl-9 last:pb-1" data-testid="timeline-stop">
      {!isLast && (
        <span
          className="absolute left-2.75 top-7 h-[calc(100%-1.75rem)] w-0.5 bg-slate-200"
          aria-hidden
        />
      )}
      <span
        className="absolute left-0 top-0.5 grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white shadow-sm"
        style={{ background: style.color }}
        aria-hidden
      >
        {style.glyph}
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm font-semibold text-slate-900">{style.name}</p>
        <p className="font-mono text-xs text-slate-500">
          {formatDateTime(stop.arrival)}
        </p>
      </div>
      <p className="mt-0.5 text-[13px] text-slate-600">{stop.location_name}</p>
      <p className="text-xs text-slate-400">
        Mile {Math.round(stop.mile).toLocaleString("en-US")}
        {stop.duration_hours > 0 && <> · {formatHours(stop.duration_hours)} stop</>}
      </p>
    </li>
  );
}

export default function StopsTimeline({ plan }: { plan: TripPlan }) {
  return (
    <section
      className="flex h-80 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-105"
      aria-label="Stops and rests"
      data-testid="stops-timeline"
    >
      <header className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">Stops &amp; rests</h2>
        <p className="text-xs text-slate-500">
          Every duty change on the schedule, in order.
        </p>
      </header>
      <ol className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        {plan.stops.map((stop, index) => (
          <TimelineItem
            key={`${stop.type}-${index}`}
            stop={stop}
            isLast={index === plan.stops.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}
