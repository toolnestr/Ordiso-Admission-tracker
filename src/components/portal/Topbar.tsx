import { LogOut } from "lucide-react";
import { signOut } from "@/app/(portal)/actions";
import { FREE_TIER_CAP, type PortalContext } from "@/lib/portal";
import MobileNav from "./MobileNav";

export default function Topbar({ ctx }: { ctx: PortalContext }) {
  const { institute, session, name, role } = ctx;
  const count = session?.total_applications_received ?? 0;
  const nearCap = institute.plan === "Free" && count >= 180;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl sm:gap-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileNav role={role} />
        <span className="truncate text-[14px] font-semibold tracking-tight">
          {institute.display_name}
        </span>
        {session ? (
          <span className="hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[11.5px] text-muted-strong sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {session.name}
          </span>
        ) : (
          <span className="badge badge-amber hidden shrink-0 rounded-md px-2 py-1 text-[11.5px] sm:inline">
            No open session
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {institute.plan === "Free" && session && (
          <span
            className={`shrink-0 rounded-md px-2 py-1 text-[11.5px] tabular-nums ${
              nearCap
                ? "badge badge-amber"
                : "border border-border bg-surface text-muted"
            }`}
          >
            {count} / {FREE_TIER_CAP}
            <span className="hidden sm:inline"> students</span>
          </span>
        )}

        <div className="hidden text-right sm:block">
          <div className="text-[12.5px] font-medium leading-tight">{name}</div>
          <div className="text-[11px] leading-tight text-muted">{role}</div>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            aria-label="Log out"
            className="surface-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
