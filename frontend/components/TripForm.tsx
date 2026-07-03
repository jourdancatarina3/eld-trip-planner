"use client";

import { useState } from "react";
import LocationInput from "./LocationInput";
import type { LocationRef, TripRequest } from "@/lib/types";

interface Props {
  onSubmit: (request: TripRequest) => void;
  loading: boolean;
}

interface LocationState {
  text: string;
  selected: LocationRef | null;
}

const EMPTY: LocationState = { text: "", selected: null };

const SAMPLE_TRIPS = [
  {
    label: "Chicago → Dallas",
    current: "Chicago, IL",
    pickup: "St. Louis, MO",
    dropoff: "Dallas, TX",
    cycle: "20",
  },
  {
    label: "LA → New York",
    current: "Los Angeles, CA",
    pickup: "Las Vegas, NV",
    dropoff: "New York, NY",
    cycle: "45",
  },
  {
    label: "Seattle → Denver",
    current: "Seattle, WA",
    pickup: "Portland, OR",
    dropoff: "Denver, CO",
    cycle: "0",
  },
];

function defaultStartTime(): string {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const PIN_ICON = (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M9.7 17.7a.75.75 0 0 0 .6 0c.1 0 .2-.1.3-.2a26 26 0 0 0 2.3-2 15 15 0 0 0 2-2.4c.8-1.2 1.6-2.8 1.6-4.6a6.5 6.5 0 1 0-13 0c0 1.8.8 3.4 1.6 4.6a15 15 0 0 0 4.3 4.4l.3.2ZM10 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      clipRule="evenodd"
    />
  </svg>
);

const TRUCK_ICON = (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M1 5.5A1.5 1.5 0 0 1 2.5 4h8A1.5 1.5 0 0 1 12 5.5V12h1.2a2.4 2.4 0 0 1 4.53 0H18a1 1 0 0 0 1-1V9.6a1 1 0 0 0-.3-.7l-2.6-2.6a1 1 0 0 0-.7-.3H13V5.5c0-.28.22-.5.5-.5H15c.66 0 1.3.26 1.77.73l2.5 2.5c.47.47.73 1.1.73 1.77V11a2.5 2.5 0 0 1-2.5 2.5h-.55a2.4 2.4 0 0 1-4.7 0H7.75a2.4 2.4 0 0 1-4.7 0H2.5A1.5 1.5 0 0 1 1 12V5.5Zm4.4 8.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm10 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" />
  </svg>
);

const FLAG_ICON = (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.39c.66-.24 1.6-.46 2.86-.46 1.14 0 2.02.28 2.97.59 1 .32 2.08.66 3.5.66 1.62 0 2.9-.41 3.7-.78a.98.98 0 0 0 .57-.9V4.03c0-.74-.78-1.19-1.44-.91-.7.3-1.72.63-2.83.63-1.14 0-2.02-.28-2.97-.59-1-.32-2.08-.66-3.5-.66-1.15 0-2.11.22-2.86.48v-.23Z" />
  </svg>
);

export default function TripForm({ onSubmit, loading }: Props) {
  const [current, setCurrent] = useState<LocationState>(EMPTY);
  const [pickup, setPickup] = useState<LocationState>(EMPTY);
  const [dropoff, setDropoff] = useState<LocationState>(EMPTY);
  const [cycleUsed, setCycleUsed] = useState("0");
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function applySample(sample: (typeof SAMPLE_TRIPS)[number]) {
    setCurrent({ text: sample.current, selected: null });
    setPickup({ text: sample.pickup, selected: null });
    setDropoff({ text: sample.dropoff, selected: null });
    setCycleUsed(sample.cycle);
    setErrors({});
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!current.text.trim()) nextErrors.current = "Enter your current location.";
    if (!pickup.text.trim()) nextErrors.pickup = "Enter the pickup location.";
    if (!dropoff.text.trim()) nextErrors.dropoff = "Enter the dropoff location.";
    const cycle = parseFloat(cycleUsed);
    if (Number.isNaN(cycle) || cycle < 0 || cycle > 70) {
      nextErrors.cycle = "Cycle hours must be between 0 and 70.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      current_location: current.selected ?? current.text.trim(),
      pickup_location: pickup.selected ?? pickup.text.trim(),
      dropoff_location: dropoff.selected ?? dropoff.text.trim(),
      current_cycle_used_hours: cycle,
      start_time: startTime || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      data-testid="trip-form"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <LocationInput
          label="Current location"
          placeholder="Where are you now?"
          icon={TRUCK_ICON}
          value={current.text}
          selected={current.selected}
          onChange={(text, selected) => setCurrent({ text, selected })}
          error={errors.current}
          testId="current-location"
        />
        <LocationInput
          label="Pickup location"
          placeholder="Where's the load?"
          icon={PIN_ICON}
          value={pickup.text}
          selected={pickup.selected}
          onChange={(text, selected) => setPickup({ text, selected })}
          error={errors.pickup}
          testId="pickup-location"
        />
        <LocationInput
          label="Dropoff location"
          placeholder="Where's it going?"
          icon={FLAG_ICON}
          value={dropoff.text}
          selected={dropoff.selected}
          onChange={(text, selected) => setDropoff({ text, selected })}
          error={errors.dropoff}
          testId="dropoff-location"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <label
            htmlFor="cycle-used"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Cycle used (hrs, last 8 days)
          </label>
          <input
            id="cycle-used"
            type="number"
            min={0}
            max={70}
            step={0.5}
            inputMode="decimal"
            data-testid="cycle-used"
            value={cycleUsed}
            onChange={(event) => setCycleUsed(event.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 ${
              errors.cycle ? "border-rose-400" : "border-slate-300"
            }`}
          />
          {errors.cycle ? (
            <p className="mt-1 text-xs text-rose-600">{errors.cycle}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              On-duty hours already used in your 70 hr / 8 day cycle.
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="start-time"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Trip start
          </label>
          <input
            id="start-time"
            type="datetime-local"
            data-testid="start-time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
          <p className="mt-1 text-xs text-slate-500">
            Home-terminal time. Logs start from this moment.
          </p>
        </div>
        <div className="flex items-end sm:col-span-2 md:col-span-1">
          <button
            type="submit"
            disabled={loading}
            data-testid="plan-trip"
            className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
                Planning trip…
              </>
            ) : (
              <>
                Plan trip
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M2 10a.75.75 0 0 1 .75-.75h12.06l-4.47-4.47a.75.75 0 1 1 1.06-1.06l5.75 5.75a.75.75 0 0 1 0 1.06l-5.75 5.75a.75.75 0 1 1-1.06-1.06l4.47-4.47H2.75A.75.75 0 0 1 2 10Z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Try a sample
        </span>
        {SAMPLE_TRIPS.map((sample) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => applySample(sample)}
            data-testid={`sample-${sample.label}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-slate-900"
          >
            {sample.label}
          </button>
        ))}
      </div>
    </form>
  );
}
