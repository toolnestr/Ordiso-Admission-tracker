"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, BarChart3, TableIcon } from "lucide-react";
import Select from "@/components/ui/Select";
import type { SessionMeta, Totals } from "./page";

/* Chart tokens. Validated against our card surface (#0e0e11):
   accent clears 3:1; accent↔context ΔE 61.7 under CVD. Text never wears
   the data color — labels use ink tokens. */
const ACCENT = "#7c74ff";
const CONTEXT = "#6b6b76"; // de-emphasis gray (emphasis form)
const GRID = "rgba(255,255,255,0.07)"; // one step off surface, hairline
const AREA_OPACITY = 0.1;

/**
 * Measures the container so the SVG can be drawn at real pixel size (no
 * viewBox scaling, which would distort stroke widths and dots).
 *
 * The initial measure is synchronous in a layout effect — waiting on the first
 * ResizeObserver callback leaves width at 0 through the first paint, and if
 * that callback doesn't fire the chart never renders at all.
 */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(() =>
      setW(el.getBoundingClientRect().width),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, w] as const;
}

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default function ReportsView({
  sessions,
  selected,
  previous,
  current,
  prior,
  pipeline,
}: {
  sessions: SessionMeta[];
  selected: SessionMeta;
  previous: SessionMeta | null;
  current: Totals;
  prior: Totals | null;
  pipeline: string[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"chart" | "table">("chart");

  const conversion =
    current.total > 0 ? Math.round((current.confirmed / current.total) * 100) : 0;
  const priorConversion =
    prior && prior.total > 0
      ? Math.round((prior.confirmed / prior.total) * 100)
      : null;

  const statusData = pipeline
    .map((s) => ({ label: s, value: current.byStatus[s] ?? 0 }))
    .filter((d) => d.value > 0);

  const sourceData = ["QR", "Direct", "Shared"]
    .map((s) => ({ label: s, value: current.bySource[s] ?? 0 }))
    .filter((d) => d.value > 0);

  function exportCsv() {
    const lines: string[] = [`Session,${selected.name}`, ""];
    lines.push("Status,Applicants");
    for (const d of statusData) lines.push(`${d.label},${d.value}`);
    lines.push("", "Source,Applicants");
    for (const d of sourceData) lines.push(`${d.label},${d.value}`);
    lines.push("", "Date,Applications");
    for (const d of current.byDay) lines.push(`${d.date},${d.count}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${selected.name.replace(/\s+/g, "-").toLowerCase()}-report.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      {/* One filter row above everything it scopes */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="w-56">
          <Select
            value={selected.id}
            onChange={(v) => router.push(`/reports?session=${v}`)}
            options={sessions.map((s) => ({
              value: s.id,
              label: s.name,
              description: s.status === "Open" ? "Open" : "Closed",
            }))}
            searchable={sessions.length > 8}
          />
        </div>

        <div className="surface-2 flex rounded-lg p-0.5">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                view === v ? "bg-[var(--border)] text-foreground" : "text-muted"
              }`}
            >
              {v === "chart" ? (
                <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.8} />
              ) : (
                <TableIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
              )}
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={exportCsv}
          className="surface-2 ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
        >
          <Download className="h-4 w-4" strokeWidth={1.8} />
          Export CSV
        </button>
      </div>

      {/* KPI row — the numbers are the point, so they're tiles, not charts */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total applicants" value={current.total} prior={prior?.total} />
        <Stat label="Admitted" value={current.admitted} prior={prior?.admitted} />
        <Stat label="Confirmed" value={current.confirmed} prior={prior?.confirmed} />
        <Stat
          label="Conversion"
          value={conversion}
          prior={priorConversion ?? undefined}
          suffix="%"
        />
      </div>

      {current.total === 0 ? (
        <div className="card-sheen mt-4 rounded-2xl px-6 py-16 text-center">
          <h3 className="text-[15px] font-medium">No applicants in this session</h3>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Once applications arrive, your charts will appear here.
          </p>
        </div>
      ) : view === "table" ? (
        <TableView
          statusData={statusData}
          sourceData={sourceData}
          byDay={current.byDay}
        />
      ) : (
        <div className="mt-4 space-y-4">
          <Card
            title="Applications over time"
            subtitle={`Daily submissions · ${selected.name}`}
          >
            <TimeSeries data={current.byDay} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Applicants by stage" subtitle="Current pipeline">
              <HBars data={statusData} />
            </Card>
            <Card title="Where applicants came from" subtitle="Captured at submission">
              <HBars data={sourceData} />
            </Card>
          </div>

          {prior && previous && (
            <Card
              title="Session comparison"
              subtitle={`${selected.name} vs ${previous.name}`}
            >
              <Comparison
                currentName={selected.name}
                previousName={previous.name}
                rows={[
                  { label: "Total applicants", a: current.total, b: prior.total },
                  { label: "Admitted", a: current.admitted, b: prior.admitted },
                  { label: "Confirmed", a: current.confirmed, b: prior.confirmed },
                ]}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-sheen rounded-2xl p-5">
      <h3 className="text-[14px] font-medium">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Stat tile: label · value · delta vs the previous session. */
function Stat({
  label,
  value,
  prior,
  suffix = "",
}: {
  label: string;
  value: number;
  prior?: number;
  suffix?: string;
}) {
  const delta = prior === undefined ? null : value - prior;
  return (
    <div className="card-sheen rounded-xl p-4">
      <div className="text-[12px] text-muted">{label}</div>
      {/* proportional figures — tabular-nums would look loose at this size */}
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">
          {value}
          {suffix}
        </span>
        {delta !== null && delta !== 0 && (
          <span
            className={`text-[11.5px] font-medium ${
              delta > 0 ? "text-emerald-400" : "text-muted"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta}
            {suffix} vs last
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Horizontal bars. One series -> one hue for every bar (a value-ramp here would
 * double-encode length as color). Value sits at the tip; no legend, since the
 * card title already names what's plotted.
 */
function HBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return <p className="py-6 text-center text-[13px] text-muted">No data.</p>;
  }
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-[12.5px] text-muted-strong">
            {d.label}
          </span>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-2.5 flex-1">
              <div
                className="h-full"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: ACCENT,
                  // 4px rounded data-end, square at the baseline
                  borderRadius: "0 4px 4px 0",
                  minWidth: 2,
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[12.5px] tabular-nums text-muted">
              {d.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Line + 10% area wash, hairline solid grid, crosshair tooltip on hover. */
function TimeSeries({ data }: { data: { date: string; count: number }[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const H = 180;
  const PAD = { t: 8, r: 8, b: 24, l: 28 };
  const iw = Math.max(w - PAD.l - PAD.r, 10);
  const ih = H - PAD.t - PAD.b;

  const max = Math.max(...data.map((d) => d.count), 1);
  const niceMax = Math.max(Math.ceil(max / 4) * 4, 4);

  const pts = useMemo(
    () =>
      data.map((d, i) => ({
        x: PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw),
        y: PAD.t + ih - (d.count / niceMax) * ih,
        ...d,
      })),
    [data, iw, ih, niceMax, PAD.l, PAD.t],
  );

  if (data.length === 0) {
    return <p className="py-6 text-center text-[13px] text-muted">No data.</p>;
  }

  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${PAD.l},${PAD.t + ih} ${line} ${pts[pts.length - 1].x},${PAD.t + ih}`;
  const ticks = [0, niceMax / 2, niceMax];

  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <svg
          width={w}
          height={H}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            // nearest-point layer: hit target is the whole column, not the dot
            let best = 0;
            let bd = Infinity;
            pts.forEach((p, i) => {
              const d = Math.abs(p.x - x);
              if (d < bd) {
                bd = d;
                best = i;
              }
            });
            setHover(best);
          }}
        >
          {ticks.map((t) => {
            const y = PAD.t + ih - (t / niceMax) * ih;
            return (
              <g key={t}>
                <line
                  x1={PAD.l}
                  x2={w - PAD.r}
                  y1={y}
                  y2={y}
                  stroke={GRID}
                  strokeWidth={1}
                />
                <text
                  x={PAD.l - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[var(--muted)] text-[9px] tabular-nums"
                >
                  {t}
                </text>
              </g>
            );
          })}

          <polyline points={area} fill={ACCENT} fillOpacity={AREA_OPACITY} />
          <polyline
            points={line}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {hover !== null && (
            <>
              <line
                x1={pts[hover].x}
                x2={pts[hover].x}
                y1={PAD.t}
                y2={PAD.t + ih}
                stroke={GRID}
                strokeWidth={1}
              />
              {/* 2px surface ring keeps the dot legible over the line */}
              <circle
                cx={pts[hover].x}
                cy={pts[hover].y}
                r={4}
                fill={ACCENT}
                stroke="#0e0e11"
                strokeWidth={2}
              />
            </>
          )}

          {/* first / last x labels only — a label per day would collide */}
          <text
            x={PAD.l}
            y={H - 6}
            className="fill-[var(--muted)] text-[9px]"
          >
            {fmtDay(data[0].date)}
          </text>
          {data.length > 1 && (
            <text
              x={w - PAD.r}
              y={H - 6}
              textAnchor="end"
              className="fill-[var(--muted)] text-[9px]"
            >
              {fmtDay(data[data.length - 1].date)}
            </text>
          )}
        </svg>
      )}

      {hover !== null && w > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border-strong bg-[#12121a] px-2.5 py-1.5 text-[12px] shadow-lg"
          style={{
            left: Math.min(Math.max(pts[hover].x - 40, 0), w - 90),
            top: Math.max(pts[hover].y - 46, 0),
          }}
        >
          <div className="text-muted">{fmtDay(data[hover].date)}</div>
          <div className="font-medium tabular-nums">
            {data[hover].count}{" "}
            {data[hover].count === 1 ? "application" : "applications"}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Emphasis, not categorical: the selected session is the subject (accent), the
 * previous one is context (gray). Two series, so a legend is mandatory.
 */
function Comparison({
  currentName,
  previousName,
  rows,
}: {
  currentName: string;
  previousName: string;
  rows: { label: string; a: number; b: number }[];
}) {
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <LegendKey color={ACCENT} label={currentName} />
        <LegendKey color={CONTEXT} label={previousName} />
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 text-[12.5px] text-muted-strong">{r.label}</div>
            {/* 2px surface gap separates the touching bars — no borders */}
            <div className="space-y-[2px]">
              <Bar value={r.a} max={max} color={ACCENT} />
              <Bar value={r.b} max={max} color={CONTEXT} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1">
        <div
          className="h-full"
          style={{
            width: `${(value / max) * 100}%`,
            background: color,
            borderRadius: "0 4px 4px 0",
            minWidth: 2,
          }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[12.5px] tabular-nums text-muted">
        {value}
      </span>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] text-muted-strong">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** The table twin — every value stays reachable without reading a chart. */
function TableView({
  statusData,
  sourceData,
  byDay,
}: {
  statusData: { label: string; value: number }[];
  sourceData: { label: string; value: number }[];
  byDay: { date: string; count: number }[];
}) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <SimpleTable title="Applicants by stage" head={["Stage", "Applicants"]} rows={statusData.map((d) => [d.label, String(d.value)])} />
      <SimpleTable title="Source" head={["Source", "Applicants"]} rows={sourceData.map((d) => [d.label, String(d.value)])} />
      <div className="lg:col-span-2">
        <SimpleTable
          title="Applications over time"
          head={["Date", "Applications"]}
          rows={byDay.map((d) => [fmtDay(d.date), String(d.count)])}
        />
      </div>
    </div>
  );
}

function SimpleTable({
  title,
  head,
  rows,
}: {
  title: string;
  head: string[];
  rows: string[][];
}) {
  return (
    <div className="card-sheen overflow-hidden rounded-2xl">
      <h3 className="border-b border-border px-4 py-3 text-[14px] font-medium">
        {title}
      </h3>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 bg-[#0e0e12]">
            <tr className="text-[11.5px] uppercase tracking-wide text-muted">
              {head.map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2 font-medium ${i > 0 ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={head.length} className="px-4 py-6 text-center text-muted">
                  No data.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((c, j) => (
                    <td
                      key={j}
                      className={`px-4 py-2 ${j > 0 ? "text-right tabular-nums" : "text-muted-strong"}`}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
