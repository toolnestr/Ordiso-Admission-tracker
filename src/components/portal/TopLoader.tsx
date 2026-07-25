"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A thin white progress bar pinned to the very top of the viewport. It signals
 * "navigating…" the instant any in-app link is clicked and completes when the
 * new route commits — so the portal never feels stuck while a slow Supabase
 * page renders. Unlike the per-link sidebar spinner this is GLOBAL: it works
 * for content links (an applicant row), the mobile drawer, everything, on any
 * screen size.
 */
export default function TopLoader() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (trickle.current) clearInterval(trickle.current);
    if (hide.current) clearTimeout(hide.current);
    trickle.current = null;
    hide.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    activeRef.current = true;
    setActive(true);
    setProgress(8);
    // Ease toward 90% and wait there until the route actually commits.
    trickle.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(0.4, (90 - p) * 0.08)));
    }, 180);
  }, [clearTimers]);

  const done = useCallback(() => {
    clearTimers();
    activeRef.current = false;
    setProgress(100);
    hide.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 220);
  }, [clearTimers]);

  // START: intercept plain left-clicks on same-origin, same-tab links.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const target = a.getAttribute("target");
      if ((target && target !== "_self") || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      // Same page (or hash-only) — no navigation to signal.
      if (url.pathname === location.pathname && url.search === location.search)
        return;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // COMPLETE: the route path changed, so the navigation finished. Only act if a
  // load was actually in flight (skips the mount run and same-path effects).
  useEffect(() => {
    if (!activeRef.current) return;
    done();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2.5px]"
      style={{ opacity: active ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full rounded-r-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]"
        style={{ width: `${progress}%`, transition: "width 180ms ease" }}
      />
    </div>
  );
}
