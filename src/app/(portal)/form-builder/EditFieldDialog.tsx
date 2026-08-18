"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, X } from "lucide-react";
import Select from "@/components/ui/Select";
import { updateField, type FieldActionState } from "./actions";

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

export type FormFieldData = {
  id: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  options: unknown;
  is_document_field: boolean;
};

export default function EditFieldDialog({
  open,
  onClose,
  field,
  isPremium,
}: {
  open: boolean;
  onClose: () => void;
  field: FormFieldData;
  isPremium: boolean;
}) {
  const [type, setType] = useState(field.field_type);
  const [label, setLabel] = useState(field.field_label);
  const [isRequired, setIsRequired] = useState(field.is_required);
  const [optionsText, setOptionsText] = useState(() => {
    if (Array.isArray(field.options)) {
      return field.options.join("\n");
    }
    return "";
  });

  const [state, action, pending] = useActionState(updateField, initial);

  // Sync state when dialog opens or field changes
  useEffect(() => {
    if (open) {
      setType(field.field_type);
      setLabel(field.field_label);
      setIsRequired(field.is_required);
      setOptionsText(
        Array.isArray(field.options) ? field.options.join("\n") : "",
      );
    }
  }, [open, field]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Close once the action finishes successfully
  const wasPending = useRef(false);
  useEffect(() => {
    if (!pending && wasPending.current && !state.error) {
      onClose();
    }
    wasPending.current = pending;
  }, [pending, state.error, onClose]);

  if (!open || typeof document === "undefined") return null;

  const showOptions = OPTION_TYPES.includes(type);
  const isFile = type === "file";

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border-strong bg-[#12121a] shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-[15px] font-medium">Edit field</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <form action={action} className="space-y-4">
            <input type="hidden" name="field_id" value={field.id} />

            <label className="block">
              <span className="text-[13px] font-medium text-muted-strong">
                Field label
              </span>
              <input
                name="field_label"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Full name"
                className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
              />
            </label>

            <div className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
                Field type
              </span>
              <Select
                name="field_type"
                value={type}
                onChange={setType}
                options={TYPES}
              />
            </div>

            {showOptions && (
              <label className="block">
                <span className="text-[13px] font-medium text-muted-strong">
                  Options{" "}
                  <span className="font-normal text-muted">(one per line)</span>
                </span>
                <textarea
                  name="options"
                  rows={3}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
                />
              </label>
            )}

            {isFile && !isPremium && (
              <div className="flex items-start gap-2 rounded-lg border border-accent-soft bg-accent-soft px-3 py-2.5 text-[13px] text-accent">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  File upload is a Premium feature. On the public form it will
                  show as locked until you upgrade.
                </span>
              </div>
            )}

            <label className="flex items-center gap-2.5">
              <input
                name="is_required"
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="surface-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--border)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
