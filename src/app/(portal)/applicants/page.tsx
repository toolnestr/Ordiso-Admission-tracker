import Link from "next/link";
import { Users, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";

const STATUS_STYLE: Record<string, string> = {
  Applied: "bg-surface-2 text-muted-strong",
  Shortlisted: "bg-accent-soft text-accent",
  Interview: "bg-amber-500/10 text-amber-300",
  Admitted: "bg-blue-500/10 text-blue-300",
  Confirmed: "bg-emerald-500/10 text-emerald-300",
  "Confirmed-Partial": "bg-emerald-500/10 text-emerald-300",
  Rejected: "bg-red-500/10 text-red-300",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function displayName(form_data: Record<string, unknown>, fallback: string) {
  const keys = ["full_name", "name", "student_name", "Full Name", "Name"];
  for (const k of keys) {
    const v = form_data?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

export default async function ApplicantsPage() {
  const ctx = await getPortalContext();
  const supabase = await createClient();

  const { data: applicants } = await supabase
    .from("applicants")
    .select(
      "id, application_id, form_data, email, phone, status, source, created_at",
    )
    .order("created_at", { ascending: false });

  const list = applicants ?? [];

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
            Applicants
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
            {list.length > 0
              ? `${list.length} applicant${list.length === 1 ? "" : "s"}`
              : "Applicants"}
          </h1>
        </div>
        <Link
          href="/share"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          <Share2 className="h-4 w-4" strokeWidth={1.8} />
          Share form
        </Link>
      </div>

      <div className="mt-6">
        {list.length === 0 ? (
          <div className="card-sheen flex flex-col items-center rounded-2xl px-6 py-16 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2 text-accent">
              <Users className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-[15px] font-medium">No applicants yet</h3>
            <p className="mt-1.5 max-w-sm text-[13.5px] text-muted">
              {ctx.session
                ? "Share your application link or QR code to start receiving applications."
                : "Open an admission session, then share your form to receive applications."}
            </p>
            <Link
              href={ctx.session ? "/share" : "/sessions"}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {ctx.session ? "Share your link" : "Create a session"}
            </Link>
          </div>
        ) : (
          <div className="surface overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-[12px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Applicant</th>
                  <th className="px-4 py-3 font-medium">Applied</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Application ID</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-surface"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {displayName(
                          a.form_data as Record<string, unknown>,
                          a.email || a.phone || "Unknown",
                        )}
                      </div>
                      {a.email && (
                        <div className="text-[12px] text-muted">{a.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-strong">
                      {fmtDate(a.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${
                          STATUS_STYLE[a.status] ?? "bg-surface-2 text-muted"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-strong">{a.source}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-muted">
                      {a.application_id}
                    </td>
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
