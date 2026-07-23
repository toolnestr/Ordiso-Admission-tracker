"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sparkles } from "lucide-react";
import { Logo } from "@/components/landing/Nav";
import { nav } from "./Sidebar";
import type { StaffRole } from "@/lib/portal";

/**
 * Mobile navigation. The desktop sidebar is `hidden md:flex`, so on phones the
 * portal had no navigation at all — this hamburger opens a slide-in drawer with
 * the same role-filtered links. Hidden on md+ where the sidebar takes over.
 */
export default function MobileNav({ role }: { role: StaffRole }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const items = nav.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="surface-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground md:hidden"
      >
        <Menu className="h-4 w-4" strokeWidth={1.8} />
      </button>

      {/* Portalled to <body> so the Topbar's backdrop-blur (which would
          otherwise become the containing block for this fixed overlay and trap
          it inside the header) can't confine or show through it. */}
      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100] md:hidden">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-[#0b0b10] px-3 py-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <Logo />
                <span className="text-[15px] font-semibold tracking-tight">
                  Ordiso
                </span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[14px] transition-colors ${
                      active
                        ? "bg-surface-2 font-medium text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon
                      className={`h-[18px] w-[18px] ${active ? "text-accent" : ""}`}
                      strokeWidth={1.7}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/upgrade"
              className="mt-2 flex items-center gap-2.5 rounded-lg border border-accent-soft bg-accent-soft px-2.5 py-2.5 text-[14px] font-medium text-accent"
            >
              <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.7} />
              Upgrade
            </Link>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
