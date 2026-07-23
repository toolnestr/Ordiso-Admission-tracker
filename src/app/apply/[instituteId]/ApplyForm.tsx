"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deriveContact } from "@/components/enquiry/fields";
import { planFeatures, type Plan } from "@/lib/plan";
import { sendReceivedEmails, uploadApplicantDocument } from "./actions";
import StudentBlocks, {
  newStudent,
  toGroupPayload,
  mergedValues,
  type Student,
} from "@/components/enquiry/StudentBlocks";

// Re-exported for callers that still import the field types from here.
export type { PublicField } from "@/components/enquiry/fields";

export type PublicForm = {
  institute: {
    id: string;
    display_name: string;
    plan: Plan;
    plan_expires_at?: string | null;
  };
  session: {
    id: string;
    name: string;
    is_full: boolean;
  } | null;
  fields: {
    id: string;
    label: string;
    type: string;
    required: boolean;
    options: string[];
    is_document_field: boolean;
  }[];
  programs: { id: string; name: string }[];
};

type Created = { application_id: string; possible_duplicate: boolean };
type Result = { students: Created[]; familyCode?: string };

export default function ApplyForm({
  form,
  instituteId,
}: {
  form: PublicForm;
  instituteId: string;
}) {
  const [students, setStudents] = useState<Student[]>([newStudent()]);
  const [shared, setShared] = useState<Record<string, string>>({});
  const [familyLabel, setFamilyLabel] = useState("");
  const [files, setFiles] = useState<
    Record<string, Record<string, File | undefined>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const isPremium = planFeatures(
    form.institute.plan,
    form.institute.plan_expires_at,
  ).uploads;

  function setFile(key: string, label: string, file: File | undefined) {
    setFiles((prev) => ({ ...prev, [key]: { ...prev[key], [label]: file } }));
  }

  // Upload each student's attached files to their created applicant. Best-effort.
  async function uploadFiles(pairs: { key: string; appId: string }[]) {
    for (const { key, appId } of pairs) {
      const perField = files[key];
      if (!perField) continue;
      for (const [label, file] of Object.entries(perField)) {
        if (!file) continue;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("label", label);
        await uploadApplicantDocument(appId, fd);
      }
    }
  }

  function friendlyError(code?: string) {
    if (code === "session_full")
      return "This admission cycle is now full. Please contact the institute.";
    if (code === "no_open_session" || code === "session_closed")
      return "Applications are closed right now. Please try again later.";
    return "Something went wrong submitting your application. Please try again.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.programs.length > 0 && students.some((s) => !s.programId)) {
      setError("Please choose a program for every applicant.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    if (students.length === 1) {
      const values = mergedValues(students[0], shared);
      const { email, phone } = deriveContact(form.fields, values);
      const { data, error: rpcErr } = await supabase.rpc("submit_application", {
        p_institute_id: instituteId,
        p_form_data: values,
        p_email: email,
        p_phone: phone,
        p_program_id: students[0].programId || null,
        p_source: "Direct",
      });
      setSubmitting(false);
      const res = data as {
        application_id?: string;
        error?: string;
        possible_duplicate?: boolean;
      };
      if (rpcErr || !res?.application_id) {
        setError(friendlyError(res?.error));
        return;
      }
      setResult({
        students: [
          {
            application_id: res.application_id,
            possible_duplicate: !!res.possible_duplicate,
          },
        ],
      });
      void sendReceivedEmails([res.application_id]);
      void uploadFiles([{ key: students[0].key, appId: res.application_id }]);
      return;
    }

    const { data, error: rpcErr } = await supabase.rpc("submit_enquiry_group", {
      p_institute_id: instituteId,
      p_family_label: familyLabel,
      p_students: toGroupPayload(students, form.fields, shared),
    });
    setSubmitting(false);
    const res = data as {
      students?: Created[];
      family_code?: string;
      error?: string;
    };
    if (rpcErr || !res?.students) {
      setError(friendlyError(res?.error));
      return;
    }
    setResult({ students: res.students, familyCode: res.family_code });
    void sendReceivedEmails(res.students.map((s) => s.application_id));
    void uploadFiles(
      students.map((s, i) => ({
        key: s.key,
        appId: res.students![i].application_id,
      })),
    );
  }

  if (result) {
    return <Confirmation result={result} />;
  }

  return (
    <form onSubmit={handleSubmit} className="card-sheen rounded-2xl p-6">
      <h1 className="text-lg font-semibold">
        Apply to {form.institute.display_name}
      </h1>
      {form.session && (
        <p className="mt-1 text-[13px] text-muted">{form.session.name}</p>
      )}

      <div className="mt-6">
        <StudentBlocks
          fields={form.fields}
          programs={form.programs}
          isPremium={isPremium}
          students={students}
          setStudents={setStudents}
          shared={shared}
          setShared={setShared}
          familyLabel={familyLabel}
          setFamilyLabel={setFamilyLabel}
          files={files}
          setFile={setFile}
        />
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
        {submitting
          ? "Submitting…"
          : students.length > 1
            ? `Submit ${students.length} applications`
            : "Submit application"}
      </button>

      <p className="mt-4 text-center text-[13px] text-muted">
        Already applied?{" "}
        <a href="/status" className="font-medium text-accent hover:underline">
          Track your application
        </a>
      </p>
    </form>
  );
}

function Confirmation({ result }: { result: Result }) {
  const [copied, setCopied] = useState<string | null>(null);
  const created = result.students;
  const multi = created.length > 1;

  function copy(id: string) {
    navigator.clipboard?.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="card-sheen rounded-2xl p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <h1 className="mt-4 text-lg font-semibold">
        {multi ? `${created.length} applications submitted` : "Application submitted"}
      </h1>
      <p className="mt-2 text-[13.5px] text-muted">
        Save {multi ? "these Application IDs" : "your Application ID"} — you&apos;ll
        need {multi ? "them" : "it"} to check status. There&apos;s no account, so
        please screenshot or write {multi ? "them" : "it"} down.
      </p>

      {result.familyCode && (
        <div className="mt-5 rounded-lg border border-accent-soft bg-accent-soft px-4 py-3">
          <p className="text-[12.5px] text-muted-strong">
            Family tracking code — track all your children with one code
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-accent">
            {result.familyCode}
          </p>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {created.map((c) => (
          <div
            key={c.application_id}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="font-mono text-lg font-semibold tracking-wide">
              {c.application_id}
            </span>
            <button
              onClick={() => copy(c.application_id)}
              aria-label="Copy Application ID"
              className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground"
            >
              <Copy className="h-4 w-4" />
            </button>
            {copied === c.application_id && (
              <span className="text-[12px] text-accent">Copied!</span>
            )}
          </div>
        ))}
      </div>

      <a
        href={`/status?id=${encodeURIComponent(created[0].application_id)}`}
        className="mt-6 inline-block text-[13px] font-medium text-accent hover:underline"
      >
        Track your application →
      </a>
    </div>
  );
}
