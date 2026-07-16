"use client";

import { stageColor } from "./palette";

export type FunnelStage = { label: string; value: number };

/**
 * Pipeline funnel: each stage a bar scaled to the top stage, with the
 * stage-to-stage conversion % shown between rows so drop-off is legible.
 * Bars use the ordinal violet ramp (stages are ordered), value at the tip.
 */
export default function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = Math.max(stages[0]?.value ?? 0, 1);

  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const pctOfTop = (s.value / top) * 100;
        const prev = stages[i - 1];
        const conv =
          prev && prev.value > 0
            ? Math.min(Math.round((s.value / prev.value) * 100), 100)
            : null;
        return (
          <div key={s.label}>
            {conv !== null && (
              <div className="flex items-center gap-2 py-0.5 pl-1">
                <span className="text-[11px] text-muted">↓ {conv}%</span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[12.5px] text-muted-strong">
                {s.label}
              </span>
              <div className="flex flex-1 items-center gap-2">
                <div className="h-7 flex-1">
                  <div
                    className="flex h-full items-center justify-end rounded-md px-2"
                    style={{
                      width: `${Math.max(pctOfTop, 4)}%`,
                      background: stageColor(s.label),
                      minWidth: 28,
                      transition: "width 0.4s ease",
                    }}
                  >
                    <span className="text-[12px] font-medium tabular-nums text-[#0e0e11]">
                      {s.value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
