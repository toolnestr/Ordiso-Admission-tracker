import { CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import NewSessionForm from "./NewSessionForm";
import { CloseButton, ReopenButton } from "./SessionActions";

function fmt(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function SessionsPage() {
  const ctx = await getPortalContext();
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, name, start_date, end_date, status, total_applications_received, target_goal",
    )
    .order("start_date", { ascending: false });

  const list = sessions ?? [];
  const hasOpen = list.some((s) => s.status === "Open");

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
            Sessions
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
            Admission sessions
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            One session can be open at a time. Closing a session stops the
            public form from accepting new applications.
          </p>
        </div>
      </div>

      {ctx.role === "Admin" && (
        <div className="mt-6">
          <NewSessionForm hasOpen={hasOpen} />
        </div>
      )}

      <div className="mt-6">
        {list.length === 0 ? (
          <div className="card-sheen flex flex-col items-center rounded-2xl px-6 py-16 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2 text-accent">
              <CalendarRange className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-[15px] font-medium">No sessions yet</h3>
            <p className="mt-1.5 max-w-sm text-[13.5px] text-muted">
              Create your first admission session to start collecting
              applications.
            </p>
          </div>
        ) : (
          <div className="surface overflow-hidden rounded-2xl">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-[12px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Applicants
                  </th>
                  {ctx.role === "Admin" && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      {s.target_goal && (
                        <div className="text-[12px] text-muted">
                          Target: {s.target_goal}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-strong">
                      {fmt(s.start_date)} — {fmt(s.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${
                          s.status === "Open"
                            ? "bg-accent-soft text-accent"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            s.status === "Open" ? "bg-accent" : "bg-muted"
                          }`}
                        />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.total_applications_received}
                    </td>
                    {ctx.role === "Admin" && (
                      <td className="px-4 py-3 text-right">
                        {s.status === "Open" ? (
                          <CloseButton sessionId={s.id} />
                        ) : (
                          <ReopenButton sessionId={s.id} disabled={hasOpen} />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
