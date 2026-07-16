"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Custom listbox replacing native <select>.
 *
 * Native option lists are painted by the OS and ignore page styling entirely —
 * on our dark UI they render as a white popup with unreadable text. This is a
 * fully-styled, keyboard-accessible equivalent. The value is mirrored into a
 * hidden input so it still posts with FormData / server actions.
 */
export default function Select({
  name,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required,
  disabled,
  className = "",
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);

  // Close on outside click / Escape.
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

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  }

  function choose(i: number) {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="surface-2 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "" : "text-muted"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          id={`${id}-list`}
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-border-strong bg-[#12121a] p-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]"
        >
          {options.map((o, i) => {
            const isSel = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-[13.5px] ${
                  i === active ? "bg-surface-2" : ""
                }`}
              >
                <span className="flex-1">
                  <span className={isSel ? "font-medium" : ""}>{o.label}</span>
                  {o.description && (
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {o.description}
                    </span>
                  )}
                </span>
                {isSel && (
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                    strokeWidth={2.5}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
