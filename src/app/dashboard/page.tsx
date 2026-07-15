import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/landing/Nav";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Relies entirely on RLS (staff_select policy) — this only returns a row
  // because auth_institute_id() resolves through the caller's own JWT.
  const { data: staff } = await supabase
    .from("staff")
    .select("name, role, institutes(display_name, plan)")
    .eq("auth_user_id", user.id)
    .single();

  const institute = Array.isArray(staff?.institutes)
    ? staff?.institutes[0]
    : staff?.institutes;

  return (
    <div className="relative min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">
            Ordiso
          </span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="surface-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
            Log out
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
          Dashboard
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em]">
          Welcome, {staff?.name ?? user.email}
        </h1>

        <div className="card-sheen mt-8 rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <div className="text-[11px] text-muted">Institute</div>
              <div className="mt-1 text-[14px] font-medium">
                {institute?.display_name ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted">Plan</div>
              <div className="mt-1 text-[14px] font-medium">
                {institute?.plan ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted">Your role</div>
              <div className="mt-1 text-[14px] font-medium">
                {staff?.role ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-[13px] text-muted">
          Auth, RLS, and institute lookup are all wired up. The rest of the
          portal (Applicants, Form Builder, Sessions…) is next.
        </p>
      </main>
    </div>
  );
}
