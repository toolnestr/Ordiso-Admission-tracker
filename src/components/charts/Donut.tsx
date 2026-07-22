"use client";

import { useState } from "react";
import { SURFACE } from "./palette";

export type DonutSlice = { label: string; value: number; color: string };

/**
 * Donut for part-to-whole (≤ ~6 segments). Center carries the total; a legend
 * with values + % is always present so identity never rests on color alone.
 * Segments carry a 2px surface-colored gap (stroke), not a border.
 */
export default function Donut({
  data,
  centerLabel = "Total",
  size = 168,
  thickness = 22,
}: {
  data: DonutSlice[];
  centerLabel?: string;
  size?: number;
  thickness?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const arcs = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const len = frac * circ;
    const arc = {
      ...d,
      i,
      frac,
      dash: len,
      gap: circ - len,
      // negative offset so arcs start at 12 o'clock and run clockwise
      offset: -offset,
    };
    offset += len;
    return arc;
  });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* track (decorative — must not intercept segment hover) */}
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={GRID_TRACK}
            strokeWidth={thickness}
            style={{ pointerEvents: "none" }}
          />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === a.i ? thickness + 3 : thickness}
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={a.offset}
              style={{
                transition: "stroke-width 0.15s",
                cursor: "pointer",
                filter:
                  hover !== null && hover !== a.i ? "opacity(0.45)" : "none",
              }}
              onMouseEnter={() => setHover(a.i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {/* surface gaps: thin surface-colored ticks at each boundary.
              pointer-events off so they don't break hover along boundaries. */}
          {arcs.map((a) => {
            const angle = (a.offset / circ) * -360;
            return (
              <line
                key={`sep-${a.label}`}
                x1={c}
                y1={c}
                x2={c + r + thickness / 2}
                y2={c}
                stroke={SURFACE}
                strokeWidth={2}
                transform={`rotate(${angle} ${c} ${c})`}
                style={{ pointerEvents: "none" }}
              />
            );
          })}
        </svg>
        {/* Center label sits over the whole donut box; without pointer-events
            off it would swallow every hover and the ring would never respond. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">
            {hover !== null ? data[hover].value : total}
          </span>
          <span className="text-[11px] text-muted">
            {hover !== null ? data[hover].label : centerLabel}
          </span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-1.5 sm:w-auto sm:min-w-[150px]">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li
              key={d.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex cursor-pointer items-center gap-2.5 text-[13px]"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: d.color }}
                aria-hidden
              />
              <span className="flex-1 whitespace-nowrap text-muted-strong">
                {d.label}
              </span>
              <span className="tabular-nums text-muted">{d.value}</span>
              <span className="w-9 text-right tabular-nums text-[12px] text-muted">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const GRID_TRACK = "rgba(255,255,255,0.05)";
