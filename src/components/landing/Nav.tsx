"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 py-3">
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-xl px-4 py-2.5 transition-all duration-300 ${
          scrolled
            ? "surface-2 shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl"
            : "border border-transparent"
        }`}
      >
        <a href="#top" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">
            Ordiso
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href="/status"
            className="whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-strong transition-colors hover:text-foreground sm:px-3.5"
          >
            Track<span className="hidden sm:inline"> application</span>
          </a>
          <a
            href="/login"
            className="hidden rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-strong transition-colors hover:text-foreground sm:block"
          >
            Login
          </a>
          <a
            href="/register"
            className="whitespace-nowrap rounded-lg bg-foreground px-2.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 sm:px-3.5"
          >
            Register<span className="hidden sm:inline"> your institute</span>
          </a>
        </div>
      </nav>
    </header>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  // A 3/4 progress-ring "O" with a marker dot — reads as Ordiso and echoes the
  // admissions pipeline the product tracks. White mark on an accent tile.
  return (
    <span
      className={`grid h-7 w-7 place-items-center rounded-[8px] bg-gradient-to-br from-[#8f88ff] to-[#6a61f0] shadow-[0_2px_10px_-3px_rgba(124,116,255,0.7)] ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="7"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="33 11"
          transform="rotate(-90 12 12)"
        />
        <circle cx="12" cy="5" r="1.9" fill="white" />
      </svg>
    </span>
  );
}
