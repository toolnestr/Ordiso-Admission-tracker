"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarRange,
  QrCode,
  UsersRound,
  BarChart3,
  Settings,
  Sparkles,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/landing/Nav";
import type { StaffRole } from "@/lib/portal";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: StaffRole[]; // undefined = all roles
};

export const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applicants", label: "Applicants", icon: Users },
  {
    href: "/form-builder",
    label: "Form Builder",
    icon: FileText,
    roles: ["Admin"],
  },
  {
    href: "/sessions",
    label: "Sessions",
    icon: CalendarRange,
    roles: ["Admin"],
  },
  { href: "/share", label: "Share & QR", icon: QrCode },
  { href: "/staff", label: "Staff", icon: UsersRound, roles: ["Admin"] },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["Admin"] },
];

// Rendered inside each nav <Link>. useLinkStatus reports the transition's
// pending state, so a spinner appears the moment a link is clicked and stays
// until the destination's data is ready — the immediate "yes, it registered"
// feedback the slow server-component navigations were missing.
function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-accent" />
  );
}

export default function Sidebar({ role }: { role: StaffRole }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface/40 px-3 py-4 md:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Ordiso</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {nav
          .filter((item) => !item.roles || item.roles.includes(role))
          .map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors ${
                  active
                    ? "bg-surface-2 font-medium text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`h-[17px] w-[17px] ${
                    active ? "text-accent" : ""
                  }`}
                  strokeWidth={1.7}
                />
                {item.label}
                <NavPending />
              </Link>
            );
          })}
      </nav>

      <Link
        href="/upgrade"
        className="mt-2 flex items-center gap-2.5 rounded-lg border border-accent-soft bg-accent-soft px-2.5 py-2 text-[13.5px] font-medium text-accent transition-opacity hover:opacity-90"
      >
        <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.7} />
        Upgrade to Premium
      </Link>
    </aside>
  );
}
