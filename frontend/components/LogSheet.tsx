"use client";

import type { DailyLog, DutyStatus } from "@/lib/types";
import { formatClock, formatDate, formatHours } from "@/lib/format";

const GRID_X = 128;
const HOUR_W = 35;
const GRID_W = HOUR_W * 24;
const GRID_TOP = 30;
const ROW_H = 38;
const ROWS: { status: DutyStatus; label: string[] }[] = [
  { status: "off_duty", label: ["1. Off Duty"] },
  { status: "sleeper_berth", label: ["2. Sleeper", "Berth"] },
  { status: "driving", label: ["3. Driving"] },
  { status: "on_duty", label: ["4. On Duty", "(Not Driving)"] },
];
const GRID_BOTTOM = GRID_TOP + ROW_H * ROWS.length;
const REMARKS_TOP = GRID_BOTTOM + 18;
const REMARKS_H = 108;
const VIEW_W = GRID_X + GRID_W + 92;
const VIEW_H = REMARKS_TOP + REMARKS_H + 8;

const HOUR_LABELS = [
  "Mid-\nnight", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
  "Noon", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "Mid-\nnight",
];

const x = (hour: number) => GRID_X + hour * HOUR_W;
const rowIndex: Record<DutyStatus, number> = {
  off_duty: 0,
  sleeper_berth: 1,
  driving: 2,
  on_duty: 3,
};
const rowCenter = (status: DutyStatus) =>
  GRID_TOP + rowIndex[status] * ROW_H + ROW_H / 2;

function dutyPath(log: DailyLog): string {
  const parts: string[] = [];
  log.entries.forEach((entry, index) => {
    const y = rowCenter(entry.status);
    const startX = x(entry.start_hour);
    const endX = x(entry.end_hour);
    if (index === 0) parts.push(`M ${startX} ${y}`);
    else parts.push(`L ${startX} ${y}`);
    parts.push(`L ${endX} ${y}`);
  });
  return parts.join(" ");
}

function HeaderField({
  label,
  value,
  className = "",
  mono = true,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p
        className={`truncate border-b border-slate-300 pb-0.5 text-[13px] font-semibold text-blue-900 ${
          mono ? "font-mono" : ""
        }`}
        title={value}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default function LogSheet({
  log,
  homeTerminal,
}: {
  log: DailyLog;
  homeTerminal: string;
}) {
  const [year, month, day] = log.date.split("-");
  const totalHours = (Object.keys(rowIndex) as DutyStatus[]).reduce(
    (sum, status) => sum + (log.totals[status] ?? 0),
    0
  );

  return (
    <article
      className="log-sheet-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-testid="log-sheet"
      aria-label={`Daily log for ${log.date}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 pb-3 pt-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Driver&apos;s Daily Log
            <span className="ml-2 font-normal normal-case text-slate-400">
              (24 hours)
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Day {log.day_number} · {formatDate(log.date)}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-sm font-semibold text-blue-900">
          <span className="border-b border-slate-300 px-1">{month}</span>
          <span className="text-slate-300">/</span>
          <span className="border-b border-slate-300 px-1">{day}</span>
          <span className="text-slate-300">/</span>
          <span className="border-b border-slate-300 px-1">{year}</span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-3 lg:grid-cols-4">
        <HeaderField label="From" value={log.from_location} />
        <HeaderField label="To" value={log.to_location} />
        <HeaderField
          label="Total miles driving today"
          value={`${Math.round(log.total_miles).toLocaleString("en-US")} mi`}
        />
        <HeaderField label="Home terminal" value={homeTerminal} />
      </div>

      <div className="overflow-x-auto px-2 pb-1" data-testid="log-grid-scroll">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="min-w-220"
          role="img"
          aria-label={`Duty status grid: ${ROWS.map(
            (row) =>
              `${row.label.join(" ")} ${formatHours(log.totals[row.status] ?? 0)}`
          ).join(", ")}`}
        >
          {/* Hour labels */}
          {HOUR_LABELS.map((label, i) => {
            const lines = label.split("\n");
            return (
              <text
                key={i}
                x={x(i)}
                y={lines.length > 1 ? 12 : 20}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight={i % 12 === 0 ? 700 : 500}
                fill="#475569"
              >
                {lines.map((line, j) => (
                  <tspan key={j} x={x(i)} dy={j === 0 ? 0 : 9}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}

          {/* Row bands + labels */}
          {ROWS.map((row, i) => {
            const top = GRID_TOP + i * ROW_H;
            return (
              <g key={row.status}>
                {row.status === "driving" && (
                  <rect
                    x={GRID_X}
                    y={top}
                    width={GRID_W}
                    height={ROW_H}
                    fill="#f8fafc"
                  />
                )}
                <text
                  x={GRID_X - 10}
                  y={top + (row.label.length > 1 ? ROW_H / 2 - 4 : ROW_H / 2 + 3)}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight={600}
                  fill="#334155"
                >
                  {row.label.map((line, j) => (
                    <tspan key={j} x={GRID_X - 10} dy={j === 0 ? 0 : 11}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}

          {/* Quarter-hour ticks */}
          {ROWS.map((row, r) => {
            const top = GRID_TOP + r * ROW_H;
            const ticks = [];
            for (let h = 0; h < 24; h++) {
              for (const quarter of [0.25, 0.5, 0.75]) {
                const len = quarter === 0.5 ? 13 : 7;
                ticks.push(
                  <line
                    key={`${h}-${quarter}`}
                    x1={x(h + quarter)}
                    y1={top}
                    x2={x(h + quarter)}
                    y2={top + len}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                );
              }
            }
            return <g key={row.status}>{ticks}</g>;
          })}

          {/* Hour grid lines */}
          {Array.from({ length: 25 }, (_, i) => (
            <line
              key={i}
              x1={x(i)}
              y1={GRID_TOP}
              x2={x(i)}
              y2={GRID_BOTTOM}
              stroke={i % 12 === 0 ? "#64748b" : "#cbd5e1"}
              strokeWidth={i % 12 === 0 ? 1.4 : 1}
            />
          ))}

          {/* Row separators + frame */}
          {ROWS.map((_, i) => (
            <line
              key={i}
              x1={GRID_X}
              y1={GRID_TOP + i * ROW_H}
              x2={GRID_X + GRID_W}
              y2={GRID_TOP + i * ROW_H}
              stroke="#94a3b8"
              strokeWidth="1"
            />
          ))}
          <rect
            x={GRID_X}
            y={GRID_TOP}
            width={GRID_W}
            height={ROW_H * ROWS.length}
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.6"
          />

          {/* Duty status line */}
          <path
            d={dutyPath(log)}
            fill="none"
            stroke="var(--log-duty-line)"
            strokeWidth="3"
            strokeLinejoin="miter"
            data-testid="duty-line"
          />

          {/* Hover targets with native tooltips */}
          {log.entries.map((entry, i) => (
            <rect
              key={i}
              x={x(entry.start_hour)}
              y={GRID_TOP + rowIndex[entry.status] * ROW_H}
              width={Math.max(x(entry.end_hour) - x(entry.start_hour), 2)}
              height={ROW_H}
              fill="transparent"
              className="hover:fill-blue-500/10"
            >
              <title>
                {`${entry.label} · ${formatClock(entry.start_hour)}–${formatClock(
                  entry.end_hour
                )} (${formatHours(entry.end_hour - entry.start_hour)})${
                  entry.location ? ` · ${entry.location}` : ""
                }`}
              </title>
            </rect>
          ))}

          {/* Totals column */}
          <text
            x={GRID_X + GRID_W + 44}
            y={GRID_TOP - 8}
            textAnchor="middle"
            fontSize="9"
            fontWeight={700}
            fill="#475569"
          >
            TOTAL HRS
          </text>
          {ROWS.map((row, i) => (
            <text
              key={row.status}
              x={GRID_X + GRID_W + 44}
              y={GRID_TOP + i * ROW_H + ROW_H / 2 + 4}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight={600}
              fontFamily="var(--font-geist-mono)"
              fill="#1e3a8a"
              data-testid={`total-${row.status}`}
            >
              {(log.totals[row.status] ?? 0).toFixed(2)}
            </text>
          ))}
          <line
            x1={GRID_X + GRID_W + 16}
            y1={GRID_BOTTOM + 4}
            x2={GRID_X + GRID_W + 72}
            y2={GRID_BOTTOM + 4}
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <text
            x={GRID_X + GRID_W + 44}
            y={GRID_BOTTOM + 16}
            textAnchor="middle"
            fontSize="11"
            fontWeight={700}
            fontFamily="var(--font-geist-mono)"
            fill="#0f172a"
            data-testid="total-day"
          >
            = {totalHours.toFixed(2)}
          </text>

          {/* Remarks band */}
          <text
            x={GRID_X - 10}
            y={REMARKS_TOP + 14}
            textAnchor="end"
            fontSize="9.5"
            fontWeight={700}
            fill="#334155"
          >
            REMARKS
          </text>
          <line
            x1={GRID_X}
            y1={REMARKS_TOP}
            x2={GRID_X + GRID_W}
            y2={REMARKS_TOP}
            stroke="#0f172a"
            strokeWidth="1.2"
          />
          <line
            x1={GRID_X}
            y1={REMARKS_TOP + REMARKS_H}
            x2={GRID_X + GRID_W}
            y2={REMARKS_TOP + REMARKS_H}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          {log.remarks.map((remark, i) => (
            <g key={i}>
              <line
                x1={x(remark.hour)}
                y1={REMARKS_TOP}
                x2={x(remark.hour)}
                y2={REMARKS_TOP + 10}
                stroke="#334155"
                strokeWidth="1.2"
              />
              <text
                x={x(remark.hour) + 3}
                y={REMARKS_TOP + 22}
                fontSize="9"
                fill="#334155"
                transform={`rotate(45 ${x(remark.hour) + 3} ${REMARKS_TOP + 22})`}
              >
                <tspan fontWeight={600}>{remark.location}</tspan>
                <tspan fill="#64748b"> — {remark.note}</tspan>
              </text>
            </g>
          ))}
        </svg>
      </div>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-600">
        <span data-testid="recap-on-duty">
          On duty today{" "}
          <strong className="font-mono text-slate-900">
            {formatHours(log.recap.on_duty_today)}
          </strong>
        </span>
        <span data-testid="recap-cycle-used">
          70-hr cycle used{" "}
          <strong className="font-mono text-slate-900">
            {formatHours(log.recap.cycle_used)}
          </strong>
        </span>
        <span data-testid="recap-available">
          Available tomorrow{" "}
          <strong className="font-mono text-emerald-700">
            {formatHours(log.recap.cycle_available_tomorrow)}
          </strong>
        </span>
      </footer>
    </article>
  );
}
