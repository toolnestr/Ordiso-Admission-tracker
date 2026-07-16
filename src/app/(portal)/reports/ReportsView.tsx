"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, BarChart3, TableIcon } from "lucide-react";
import Select from "@/components/ui/Select";
import Donut from "@/components/charts/Donut";
import Funnel from "@/components/charts/Funnel";
import AreaChart from "@/components/charts/AreaChart";
import { stageColor, sourceColor } from "@/components/charts/palette";
import type { SessionMeta, Totals } from "./page";

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
  const [timeMode, setTimeMode] = useState<"daily" | "cumulative">("daily");

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

  // Cumulative "reached at least this stage" so the funnel is monotonic even
  // though stages are skippable (a walk-in can jump straight to Admitted).
  const FUNNEL = ["Applied", "Shortlisted", "Interview", "Admitted", "Confirmed"];
  const stageValue = (s: string) =>
    s === "Confirmed" ? current.confirmed : current.byStatus[s] ?? 0;
  const funnelStages = FUNNEL.map((s, i) => ({
    label: s,
    value:
      i === 0
        ? current.total
        : FUNNEL.slice(i).reduce((sum, st) => sum + stageValue(st), 0),
  }));

  const statusSlices = statusData.map((d) => ({
    ...d,
    color: stageColor(d.label),
  }));
  const sourceSlices = sourceData.map((d) => ({
    ...d,
    color: sourceColor(d.label),
  }));

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

      {/* KPI row */}
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
          {/* Applications over time with daily/cumulative toggle */}
          <Card
            title="Applications over time"
            subtitle={`${selected.name}`}
            action={
              <div className="surface-2 flex rounded-lg p-0.5">
                {(["daily", "cumulative"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setTimeMode(m)}
                    className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium capitalize transition-colors ${
                      timeMode === m
                        ? "bg-[var(--border)] text-foreground"
                        : "text-muted"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            }
          >
            <AreaChart
              data={current.byDay.map((d) => ({ date: d.date, value: d.count }))}
              cumulative={timeMode === "cumulative"}
            />
          </Card>

          {/* Two donuts side by side */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Status distribution" subtitle="Share of applicants by stage">
              <Donut data={statusSlices} centerLabel="Applicants" />
            </Card>
            <Card title="Where applicants came from" subtitle="Captured at submission">
              <Donut data={sourceSlices} centerLabel="Applicants" />
            </Card>
          </div>

          {/* Funnel with stage-to-stage conversion */}
          <Card
            title="Admission funnel"
            subtitle="Applied → Confirmed, with drop-off at each stage"
          >
            <Funnel stages={funnelStages} />
          </Card>

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
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card-sheen rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-medium">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

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
        <LegendKey color="#7c74ff" label={currentName} />
        <LegendKey color="#6b6b76" label={previousName} />
      </div>
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 text-[12.5px] text-muted-strong">{r.label}</div>
            <div className="space-y-[2px]">
              <Bar value={r.a} max={max} color="#7c74ff" />
              <Bar value={r.b} max={max} color="#6b6b76" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
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
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

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
                <th key={h} className={`px-4 py-2 font-medium ${i > 0 ? "text-right" : ""}`}>
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
                    <td key={j} className={`px-4 py-2 ${j > 0 ? "text-right tabular-nums" : "text-muted-strong"}`}>
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
