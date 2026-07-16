"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ACCENT, GRID, SURFACE, POPOVER } from "./palette";

export type Point = { date: string; value: number };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(() => setW(el.getBoundingClientRect().width));
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

/**
 * Line + 10% area wash with a crosshair tooltip. `cumulative` switches the
 * plotted value to a running total (same data, "growth" view). Height includes
 * the x-axis band so the card never gets a nested scroll.
 */
export default function AreaChart({
  data,
  height = 200,
  cumulative = false,
  unit = "application",
}: {
  data: Point[];
  height?: number;
  cumulative?: boolean;
  unit?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(() => {
    if (!cumulative) return data;
    let run = 0;
    return data.map((d) => ({ date: d.date, value: (run += d.value) }));
  }, [data, cumulative]);

  const PAD = { t: 10, r: 10, b: 26, l: 32 };
  const iw = Math.max(w - PAD.l - PAD.r, 10);
  const ih = height - PAD.t - PAD.b;

  const max = Math.max(...series.map((d) => d.value), 1);
  const niceMax = Math.max(Math.ceil(max / 4) * 4, 4);

  const pts = useMemo(
    () =>
      series.map((d, i) => ({
        x: PAD.l + (series.length === 1 ? iw / 2 : (i / (series.length - 1)) * iw),
        y: PAD.t + ih - (d.value / niceMax) * ih,
        ...d,
      })),
    [series, iw, ih, niceMax, PAD.l, PAD.t],
  );

  if (data.length === 0) {
    return <p className="py-8 text-center text-[13px] text-muted">No data.</p>;
  }

  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${PAD.l},${PAD.t + ih} ${line} ${pts[pts.length - 1].x},${PAD.t + ih}`;
  const ticks = [0, niceMax / 2, niceMax];

  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <svg
          width={w}
          height={height}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
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
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
            </linearGradient>
          </defs>

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
                  {Math.round(t)}
                </text>
              </g>
            );
          })}

          <polygon points={area} fill="url(#area-grad)" />
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
              <circle
                cx={pts[hover].x}
                cy={pts[hover].y}
                r={4}
                fill={ACCENT}
                stroke={SURFACE}
                strokeWidth={2}
              />
            </>
          )}

          <text x={PAD.l} y={height - 7} className="fill-[var(--muted)] text-[9px]">
            {fmtDay(data[0].date)}
          </text>
          {data.length > 1 && (
            <text
              x={w - PAD.r}
              y={height - 7}
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
          className="pointer-events-none absolute z-10 rounded-lg border border-border-strong px-2.5 py-1.5 text-[12px] shadow-lg"
          style={{
            background: POPOVER,
            left: Math.min(Math.max(pts[hover].x - 45, 0), w - 100),
            top: Math.max(pts[hover].y - 48, 0),
          }}
        >
          <div className="text-muted">{fmtDay(series[hover].date)}</div>
          <div className="font-medium tabular-nums">
            {series[hover].value}{" "}
            {cumulative ? "total" : ""}{" "}
            {series[hover].value === 1 ? unit : `${unit}s`}
          </div>
        </div>
      )}
    </div>
  );
}
