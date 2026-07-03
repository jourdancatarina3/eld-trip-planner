"use client";

import { useCallback, useRef, useState } from "react";
import LogSheet from "@/components/LogSheet";
import RouteMap from "@/components/RouteMap";
import StopsTimeline from "@/components/StopsTimeline";
import TripForm from "@/components/TripForm";
import TripSummary from "@/components/TripSummary";
import { ApiError, planTrip } from "@/lib/api";
import type { TripPlan, TripRequest } from "@/lib/types";

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; plan: TripPlan };

function EmptyState() {
  const items = [
    {
      title: "HOS-checked route",
      body: "11-hr driving, 14-hr windows, 30-min breaks, 70-hr/8-day cycle and 34-hr restarts — all scheduled for you.",
    },
    {
      title: "Every required stop",
      body: "Fuel at least every 1,000 miles, 1-hour pickup and drop-off, and 10-hour rests placed along the route.",
    },
    {
      title: "Ready-to-file daily logs",
      body: "A filled-out FMCSA driver's daily log sheet for each day of the trip, drawn on the standard grid.",
    },
  ];
  return (
    <section
      className="mt-6 grid gap-3 sm:grid-cols-3"
      data-testid="empty-state"
      aria-label="What you get"
    >
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4"
        >
          <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {item.body}
          </p>
        </div>
      ))}
    </section>
  );
}

export default function Home() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(async (request: TripRequest) => {
    setState({ phase: "loading" });
    try {
      const plan = await planTrip(request);
      setState({ phase: "ready", plan });
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch (error) {
      setState({
        phase: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
  }, []);

  const plan = state.phase === "ready" ? state.plan : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="print-hidden border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400 text-slate-900"
              aria-hidden
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M1 5.5A1.5 1.5 0 0 1 2.5 4h8A1.5 1.5 0 0 1 12 5.5V12h1.2a2.4 2.4 0 0 1 4.53 0H18a1 1 0 0 0 1-1V9.6a1 1 0 0 0-.3-.7l-2.6-2.6a1 1 0 0 0-.7-.3H13V5.5c0-.28.22-.5.5-.5H15c.66 0 1.3.26 1.77.73l2.5 2.5c.47.47.73 1.1.73 1.77V11a2.5 2.5 0 0 1-2.5 2.5h-.55a2.4 2.4 0 0 1-4.7 0H7.75a2.4 2.4 0 0 1-4.7 0H2.5A1.5 1.5 0 0 1 1 12V5.5Zm4.4 8.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm10 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" />
              </svg>
            </span>
            <div>
              <p className="text-[15px] font-bold tracking-tight text-white">
                ELD Trip Planner
              </p>
              <p className="text-xs text-slate-400">
                FMCSA hours-of-service · property carrier · 70 hr / 8 day
              </p>
            </div>
          </div>
          {plan && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              data-testid="print-logs"
            >
              Print logs
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <section className="print-hidden" aria-label="Plan a trip">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Plan your trip, get compliant logs
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Enter where you are, where the load is, and where it&apos;s going.
            You&apos;ll get the route with every required stop and a filled-out
            daily log sheet for each day.
          </p>
          <div className="mt-4">
            <TripForm
              onSubmit={handleSubmit}
              loading={state.phase === "loading"}
            />
          </div>
        </section>

        {state.phase === "idle" && <EmptyState />}

        {state.phase === "error" && (
          <div
            role="alert"
            data-testid="error-banner"
            className="print-hidden mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5"
          >
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-rose-800">
                Couldn&apos;t plan that trip
              </p>
              <p className="text-sm text-rose-700">{state.message}</p>
            </div>
          </div>
        )}

        {state.phase === "loading" && (
          <div
            className="mt-6 space-y-3"
            data-testid="loading-skeleton"
            aria-hidden
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-slate-200/70"
                />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70 sm:h-105" />
          </div>
        )}

        {plan && (
          <div ref={resultsRef} className="mt-6 scroll-mt-6 space-y-6">
            <div className="print-hidden">
              <TripSummary plan={plan} />
            </div>

            <div className="print-hidden grid gap-4 lg:grid-cols-[1fr_340px]">
              <RouteMap plan={plan} />
              <StopsTimeline plan={plan} />
            </div>

            <section aria-label="Daily log sheets" data-testid="log-section">
              <div className="print-hidden mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    Daily log sheets
                  </h2>
                  <p className="text-sm text-slate-500">
                    {plan.logs.length} day{plan.logs.length === 1 ? "" : "s"} ·
                    drawn on the standard FMCSA grid · hover any segment for
                    details
                  </p>
                </div>
              </div>
              <div className="space-y-5">
                {plan.logs.map((log) => (
                  <LogSheet
                    key={log.date}
                    log={log}
                    homeTerminal={plan.summary.locations.current.name}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="print-hidden border-t border-slate-200 bg-white/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs leading-relaxed text-slate-400 sm:px-6">
          Assumes a property-carrying driver on the 70 hr/8 day cycle, no
          adverse conditions · fuel at least every 1,000 miles · 1 hour each for
          pickup and drop-off. Routing © OSRM &amp; OpenStreetMap contributors.
          Planning aid only — not legal or dispatch advice.
        </div>
      </footer>
    </div>
  );
}
