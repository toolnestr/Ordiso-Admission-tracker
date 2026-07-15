"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type PublicField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  is_document_field: boolean;
};

export type PublicForm = {
  institute: {
    id: string;
    display_name: string;
    plan: "Free" | "Premium";
  };
  session: {
    id: string;
    name: string;
    is_full: boolean;
  } | null;
  fields: PublicField[];
  programs: { id: string; name: string }[];
};

export default function ApplyForm({
  form,
  instituteId,
}: {
  form: PublicForm;
  instituteId: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [programId, setProgramId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ appId: string } | null>(null);

  const isPremium = form.institute.plan === "Premium";

  function set(label: string, v: string) {
    setValues((prev) => ({ ...prev, [label]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Derive email/phone for duplicate detection from typed fields.
    let email: string | null = null;
    let phone: string | null = null;
    for (const f of form.fields) {
      if (f.type === "email" && values[f.label]) email = values[f.label];
      if (f.type === "phone" && values[f.label]) phone = values[f.label];
    }

    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("submit_application", {
      p_institute_id: instituteId,
      p_form_data: values,
      p_email: email,
      p_phone: phone,
      p_program_id: programId || null,
      p_source: "Direct",
    });

    setSubmitting(false);

    if (rpcErr) {
      setError("Something went wrong submitting your application. Please try again.");
      return;
    }
    const res = data as { application_id?: string; error?: string };
    if (res.error === "session_full") {
      setError("This admission cycle is now full. Please contact the institute.");
      return;
    }
    if (res.error || !res.application_id) {
      setError("Applications are closed right now. Please try again later.");
      return;
    }
    setResult({ appId: res.application_id });
  }

  if (result) {
    return <Confirmation appId={result.appId} />;
  }

  return (
    <form onSubmit={handleSubmit} className="card-sheen rounded-2xl p-6">
      <h1 className="text-lg font-semibold">Apply to {form.institute.display_name}</h1>
      {form.session && (
        <p className="mt-1 text-[13px] text-muted">{form.session.name}</p>
      )}

      <div className="mt-6 space-y-5">
        {form.programs.length > 0 && (
          <FieldWrap label="Program" required>
            <select
              required
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            >
              <option value="">Select a program…</option>
              {form.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FieldWrap>
        )}

        {form.fields.map((f) => (
          <FieldRenderer
            key={f.id}
            field={f}
            value={values[f.label] ?? ""}
            onChange={(v) => set(f.label, v)}
            locked={f.is_document_field && !isPremium}
          />
        ))}
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-foreground py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

function FieldWrap({
  label,
  required,
  children,
}: {
  label: string;
  required: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13.5px] font-medium text-muted-strong">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </span>
      {children}
    </label>
  );
}

const INPUT =
  "surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong";

function FieldRenderer({
  field,
  value,
  onChange,
  locked,
}: {
  field: PublicField;
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
}) {
  const { label, type, required, options } = field;

  if (type === "file") {
    return (
      <FieldWrap label={label} required={false}>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-3 text-[13px] text-muted">
          <Lock className="h-4 w-4" />
          {locked ? "Document upload — available on Premium" : "File upload"}
        </div>
      </FieldWrap>
    );
  }

  if (type === "long_text") {
    return (
      <FieldWrap label={label} required={required}>
        <textarea
          required={required}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
        />
      </FieldWrap>
    );
  }

  if (type === "dropdown") {
    return (
      <FieldWrap label={label} required={required}>
        <select
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </FieldWrap>
    );
  }

  if (type === "radio") {
    return (
      <FieldWrap label={label} required={required}>
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2.5 text-[14px]">
              <input
                type="radio"
                name={field.id}
                required={required}
                checked={value === o}
                onChange={() => onChange(o)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {o}
            </label>
          ))}
        </div>
      </FieldWrap>
    );
  }

  if (type === "checkbox") {
    const selected = value ? value.split("|") : [];
    const toggle = (o: string) => {
      const next = selected.includes(o)
        ? selected.filter((x) => x !== o)
        : [...selected, o];
      onChange(next.join("|"));
    };
    return (
      <FieldWrap label={label} required={required}>
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2.5 text-[14px]">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
                className="h-4 w-4 rounded accent-[var(--accent)]"
              />
              {o}
            </label>
          ))}
        </div>
      </FieldWrap>
    );
  }

  const htmlType =
    type === "email"
      ? "email"
      : type === "phone"
        ? "tel"
        : type === "number"
          ? "number"
          : type === "date"
            ? "date"
            : "text";

  return (
    <FieldWrap label={label} required={required}>
      <input
        type={htmlType}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </FieldWrap>
  );
}

function Confirmation({ appId }: { appId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card-sheen rounded-2xl p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <h1 className="mt-4 text-lg font-semibold">Application submitted</h1>
      <p className="mt-2 text-[13.5px] text-muted">
        Save your Application ID — you&apos;ll need it to check your status.
        There&apos;s no account, so please screenshot or write it down.
      </p>

      <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3">
        <span className="font-mono text-lg font-semibold tracking-wide">
          {appId}
        </span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(appId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Copy Application ID"
          className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      {copied && <p className="mt-2 text-[12px] text-accent">Copied!</p>}

      <a
        href="/status"
        className="mt-6 inline-block text-[13px] font-medium text-accent hover:underline"
      >
        Check application status →
      </a>
    </div>
  );
}
