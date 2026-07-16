import Link from "next/link";
import { ShieldCheck, LogOut } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin";
import { signOut } from "@/app/(portal)/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sa = await requireSuperAdmin();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Deliberately distinct from the institute topbar — you should never be
          unsure whether you're looking at the platform or one tenant. */}
      <header className="sticky top-0 z-20 border-b border-amber-500/20 bg-amber-500/[0.06] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-[7px] border border-amber-500/30 bg-amber-500/10 text-amber-300">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <Link href="/admin" className="text-[15px] font-semibold tracking-tight">
              Ordiso <span className="text-amber-300">Super Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-[12.5px] text-muted sm:block">
              {sa.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="surface-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
