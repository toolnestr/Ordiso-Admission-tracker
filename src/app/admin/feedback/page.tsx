import { Bug, Lightbulb, Check, RotateCcw, MessageSquare } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/superadmin";
import { setFeedbackStatus } from "./actions";

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSuperAdmin();
  const { status } = await searchParams;
  const service = createServiceClient();

  const { data: rows } = await service
    .from("feedback")
    .select(
      "id, type, message, page_url, status, created_at, sender_email, institutes(display_name)",
    )
    .order("created_at", { ascending: false });

  const all = rows ?? [];
  const filtered =
    status === "Resolved"
      ? all.filter((r) => r.status === "Resolved")
      : status === "all"
        ? all
        : all.filter((r) => r.status === "New");

  const newCount = all.filter((r) => r.status === "New").length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Feedback</h1>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Bug reports and feedback sent from institute dashboards.
        {newCount > 0 && (
          <span className="ml-1 text-foreground">{newCount} new.</span>
        )}
      </p>

      <div className="surface-2 mt-6 inline-flex rounded-lg p-0.5">
        {[
          { key: undefined, label: "New" },
          { key: "Resolved", label: "Resolved" },
          { key: "all", label: "All" },
        ].map((t) => {
          const active = (status ?? undefined) === t.key;
          const href = t.key ? `/admin/feedback?status=${t.key}` : "/admin/feedback";
          return (
            <a
              key={t.label}
              href={href}
              className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                active ? "bg-[var(--border)] text-foreground" : "text-muted"
              }`}
            >
              {t.label}
            </a>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="surface flex flex-col items-center rounded-2xl py-14 text-center">
            <MessageSquare className="h-6 w-6 text-muted" strokeWidth={1.6} />
            <p className="mt-2 text-[13.5px] text-muted">Nothing here.</p>
          </div>
        ) : (
          filtered.map((r) => {
            const institute = Array.isArray(r.institutes)
              ? r.institutes[0]
              : r.institutes;
            const isBug = r.type === "Bug";
            return (
              <div key={r.id} className="surface rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-lg border ${
                        isBug
                          ? "border-red-500/25 bg-red-500/10 text-red-300"
                          : "border-accent-soft bg-accent-soft text-accent"
                      }`}
                    >
                      {isBug ? (
                        <Bug className="h-4 w-4" strokeWidth={1.8} />
                      ) : (
                        <Lightbulb className="h-4 w-4" strokeWidth={1.8} />
                      )}
                    </span>
                    <div>
                      <div className="text-[13.5px] font-medium">
                        {institute?.display_name ?? "Unknown institute"}
                      </div>
                      <div className="text-[12px] text-muted">
                        {r.sender_email ?? "—"} · {fmt(r.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {r.status === "Resolved" && (
                      <span className="badge badge-green">Resolved</span>
                    )}
                    <form action={setFeedbackStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={r.status === "Resolved" ? "New" : "Resolved"}
                      />
                      <button
                        type="submit"
                        className="surface-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--border)]"
                      >
                        {r.status === "Resolved" ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reopen
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Resolve
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-[13.5px] text-foreground/90">
                  {r.message}
                </p>
                {r.page_url && (
                  <div className="mt-2 text-[12px] text-muted">
                    From <span className="text-muted-strong">{r.page_url}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
