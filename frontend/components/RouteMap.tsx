"use client";

import dynamic from "next/dynamic";
import type { TripPlan } from "@/lib/types";

const RouteMapInner = dynamic(() => import("./RouteMapInner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-slate-100 text-sm text-slate-500">
      Loading map…
    </div>
  ),
});

export default function RouteMap({ plan }: { plan: TripPlan }) {
  return (
    <div
      className="h-80 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm sm:h-105"
      data-testid="route-map"
    >
      <RouteMapInner plan={plan} />
    </div>
  );
}
