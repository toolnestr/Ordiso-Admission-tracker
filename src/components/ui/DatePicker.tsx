"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** YYYY-MM-DD in local time (avoids the UTC off-by-one of toISOString). */
function toKey(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseKey(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Custom date picker replacing <input type="date">.
 *
 * The native control renders an OS-drawn calendar that ignores our theme and
 * looks dated. Value posts as YYYY-MM-DD through a hidden input, matching what
 * Postgres `date` columns expect.
 */
export default function DatePicker({
  name,
  value,
  onChange,
  required,
  min,
  placeholder = "Pick a date",
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  min?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseKey(value), [value]);
  const [view, setView] = useState(() => selected ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setView(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const minDate = min ? parseKey(min) : null;
  const todayKey = toKey(new Date());

  // Build the month grid, Monday-first.
  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const daysInMonth = new Date(
      view.getFullYear(),
      view.getMonth() + 1,
      0,
    ).getDate();
    const lead = (first.getDay() + 6) % 7; // Sun=0 -> Mon-first
    const out: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(new Date(view.getFullYear(), view.getMonth(), d));
    }
    return out;
  }, [view]);

  function pick(d: Date) {
    onChange(toKey(d));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="surface-2 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors hover:border-border-strong"
      >
        <span className={selected ? "" : "text-muted"}>
          {selected
            ? selected.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : placeholder}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.7} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-[268px] rounded-xl border border-border-strong bg-[#12121a] p-3 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]">
          {/* Month nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
              }
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[13.5px] font-medium">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
              }
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {DAYS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[11px] font-medium text-muted"
              >
                {d}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const key = toKey(d);
              const isSel = key === value;
              const isToday = key === todayKey;
              const disabled = minDate ? d < minDate : false;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(d)}
                  className={`grid h-8 place-items-center rounded-md text-[13px] transition-colors ${
                    isSel
                      ? "bg-accent font-medium text-white"
                      : disabled
                        ? "cursor-not-allowed text-muted/40"
                        : "hover:bg-surface-2"
                  } ${isToday && !isSel ? "text-accent" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => pick(new Date())}
              className="rounded-md px-2 py-1 text-[12px] font-medium text-accent hover:bg-surface-2"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-[12px] text-muted hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
