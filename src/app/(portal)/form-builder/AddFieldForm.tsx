"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { addField, type FieldActionState } from "./actions";

const initial: FieldActionState = { error: null };

const TYPES: { value: string; label: string }[] = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Paragraph" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Multiple choice" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "file", label: "File upload (Premium)" },
];

const OPTION_TYPES = ["dropdown", "radio", "checkbox"];

export default function AddFieldForm({ isPremium }: { isPremium: boolean }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("short_text");
  const [state, action, pending] = useActionState(addField, initial);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add field
      </button>
    );
  }

  const showOptions = OPTION_TYPES.includes(type);
  const isFile = type === "file";

  return (
    <div className="card-sheen rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-medium">Add a field</h3>
        <button
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form action={action} onSubmit={() => setTimeout(() => setOpen(false), 100)} className="space-y-4">
        <label className="block">
          <span className="text-[13px] font-medium text-muted-strong">
            Field label
          </span>
          <input
            name="field_label"
            required
            placeholder="e.g. Full name"
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-muted-strong">
            Field type
          </span>
          <select
            name="field_type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {showOptions && (
          <label className="block">
            <span className="text-[13px] font-medium text-muted-strong">
              Options{" "}
              <span className="font-normal text-muted">(one per line)</span>
            </span>
            <textarea
              name="options"
              rows={3}
              placeholder={"Engineering\nMedical\nBusiness"}
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
        )}

        {isFile && !isPremium && (
          <div className="flex items-start gap-2 rounded-lg border border-accent-soft bg-accent-soft px-3 py-2.5 text-[13px] text-accent">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              File upload is a Premium feature. You can add it now — on the
              public form it will show as locked until you upgrade.
            </span>
          </div>
        )}

        <label className="flex items-center gap-2.5">
          <input
            name="is_required"
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-[var(--accent)]"
          />
          <span className="text-[13.5px] text-muted-strong">
            Required field
          </span>
        </label>

        {state.error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add field"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="surface-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--border)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
