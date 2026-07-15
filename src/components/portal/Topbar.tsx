import { LogOut } from "lucide-react";
import { signOut } from "@/app/(portal)/actions";
import { FREE_TIER_CAP, type PortalContext } from "@/lib/portal";

export default function Topbar({ ctx }: { ctx: PortalContext }) {
  const { institute, session, name, role } = ctx;
  const count = session?.total_applications_received ?? 0;
  const nearCap = institute.plan === "Free" && count >= 180;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-6 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="text-[14px] font-semibold tracking-tight">
          {institute.display_name}
        </span>
        {session ? (
          <span className="hidden items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[11.5px] text-muted-strong sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {session.name}
          </span>
        ) : (
          <span className="hidden rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11.5px] text-amber-300 sm:inline">
            No open session
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {institute.plan === "Free" && session && (
          <span
            className={`rounded-md border px-2 py-1 text-[11.5px] tabular-nums ${
              nearCap
                ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                : "border-border bg-surface text-muted"
            }`}
          >
            {count} / {FREE_TIER_CAP} students
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
