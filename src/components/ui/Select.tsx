"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Custom listbox replacing native <select>.
 *
 * Native option lists are painted by the OS and ignore page styling entirely.
 * The open menu is portalled to <body> with fixed positioning so it floats
 * above everything — table/overflow containers used to clip it or push layout.
 * The value is mirrored into a hidden input so it still posts with FormData.
 */
export default function Select({
  name,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required,
  disabled,
  searchable = false,
  className = "",
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => setMounted(true), []);

  const selected = options.find((o) => o.value === value);

  const shown =
    searchable && query.trim()
      ? options.filter((o) =>
          `${o.label} ${o.description ?? ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
      : options;

  function reposition() {
    const b = btnRef.current?.getBoundingClientRect();
    if (b) setRect({ top: b.bottom + 6, left: b.left, width: b.width });
  }

  // Position the menu against the trigger while open, following scroll/resize.
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onMove = () => reposition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  // Close on outside click / Escape (check trigger and portalled menu).
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
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

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    if (disabled) return;
    setQuery("");
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
    if (searchable) setTimeout(() => searchRef.current?.focus(), 0);
  }

  function choose(i: number) {
    const opt = shown[i];
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
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(shown.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    } else if (e.key === " " && !searchable) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const menu = open && rect && (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
      }}
      className="z-[120] overflow-hidden rounded-xl border border-border-strong bg-[#12121a] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]"
    >
      {searchable && (
        <div className="border-b border-border p-1.5">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search…"
            className="w-full rounded-lg bg-surface-2 px-2.5 py-1.5 text-[13.5px] outline-none placeholder:text-muted"
          />
        </div>
      )}

      {shown.length === 0 ? (
        <p className="px-3 py-4 text-center text-[13px] text-muted">
          No matches
        </p>
      ) : (
        <ul
          id={`${id}-list`}
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="max-h-60 overflow-y-auto p-1"
        >
          {shown.map((o, i) => {
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

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}

      <button
        ref={btnRef}
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

      {mounted && menu && createPortal(menu, document.body)}
    </div>
  );
}
