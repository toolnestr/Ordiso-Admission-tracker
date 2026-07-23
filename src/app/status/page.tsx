"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/landing/Nav";

type StatusResult = {
  application_id: string;
  status: string;
  message: string | null;
  submitted_at: string;
  form_data?: Record<string, unknown>;
};

const STATUS_STEPS = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Admitted",
  "Confirmed",
];

function displayName(form_data: Record<string, unknown> | undefined) {
  if (form_data) {
    for (const [k, v] of Object.entries(form_data)) {
      if (/name/i.test(k) && typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

export default function StatusPage() {
  const [appId, setAppId] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusResult | null>(null);
  const [family, setFamily] = useState<StatusResult[] | null>(null);

  // Pre-fill from /status?id=ORD-XXXXXX (or FAM-XXXXXX) after applying.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setAppId(id);
  }, []);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setFamily(null);
    setLoading(true);

    const supabase = createClient();
    const code = appId.trim();
    const isFamily = /^FAM/i.test(code);

    if (isFamily) {
      const { data, error: rpcErr } = await supabase.rpc(
        "check_family_status",
        { p_family_code: code, p_contact: contact.trim() },
      );
      setLoading(false);
      if (rpcErr) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const res = data as { members?: StatusResult[]; error?: string };
      if (res.error || !res.members?.length) {
        setError(
          "No family found with that code and email/phone. Please double-check both.",
        );
        return;
      }
      setFamily(res.members);
      return;
    }

    const { data, error: rpcErr } = await supabase.rpc(
      "check_application_status",
      { p_application_id: code, p_contact: contact.trim() },
    );
    setLoading(false);
    if (rpcErr) {
      setError("Something went wrong. Please try again.");
      return;
    }
    const res = data as StatusResult & { error?: string };
    if (res.error) {
      setError(
        "No application found with that ID and email/phone. Please double-check both.",
      );
      return;
    }
    setResult(res);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-10">
      <a href="/" className="mb-6 flex items-center gap-2.5">
        <Logo />
        <span className="text-[14px] font-semibold tracking-tight">Ordiso</span>
      </a>

      <div className="card-sheen rounded-2xl p-6">
        <h1 className="text-lg font-semibold">Check your application</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Enter your Application ID (or family code) and the email or phone you
          applied with.
        </p>

        <form onSubmit={lookup} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[13px] font-medium text-muted-strong">
              Application ID or family code
            </span>
            <input
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              required
              placeholder="ORD-XXXXXX or FAM-XXXXXX"
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-muted-strong">
              Email or phone
            </span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Search className="h-4 w-4" strokeWidth={2} />
            {loading ? "Checking…" : "Check status"}
          </button>
        </form>
      </div>

      {result && <StatusCard r={result} />}

      {family && (
        <div className="mt-4 space-y-3">
          <p className="px-1 text-[13px] text-muted">
            {family.length} students in this family
          </p>
          {family.map((m) => (
            <StatusCard key={m.application_id} r={m} showName />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusCard({ r, showName }: { r: StatusResult; showName?: boolean }) {
  const rejected = r.status === "Rejected";
  const currentStep = STATUS_STEPS.indexOf(
    r.status.startsWith("Confirmed") ? "Confirmed" : r.status,
  );
  const name = displayName(r.form_data);

  return (
    <div className="card-sheen mt-4 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] text-muted">
          {showName && name ? name : r.application_id}
        </span>
        <span className={`badge ${rejected ? "badge-red" : "badge-accent"}`}>
          {r.status}
        </span>
      </div>

      {!rejected && (
        <div className="mt-5 space-y-3">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStep;
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${
                    done ? "bg-accent text-white" : "bg-surface-2 text-muted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`text-[14px] ${done ? "font-medium" : "text-muted"}`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {r.message && (
        <p className="mt-5 rounded-lg border border-border bg-surface px-3 py-2.5 text-[13.5px] text-muted-strong">
          {typeof r.message === "string" ? r.message : ""}
        </p>
      )}
    </div>
  );
}
