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

        <div className="flex items-center gap-2">
          <a
            href="/status"
            className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-strong transition-colors hover:text-foreground"
          >
            Track application
          </a>
          <a
            href="/login"
            className="hidden rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-strong transition-colors hover:text-foreground sm:block"
          >
            Login
          </a>
          <a
            href="/register"
            className="rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Register your institute
          </a>
        </div>
      </nav>
    </header>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid h-7 w-7 place-items-center rounded-[7px] border border-border-strong bg-surface-2 ${className}`}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1.5 14 5v6L8 14.5 2 11V5L8 1.5Z"
          stroke="var(--accent)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="8" r="2.1" fill="var(--accent)" />
      </svg>
    </span>
  );
}
