"use client";

import { Lock } from "lucide-react";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";

/**
 * Shared form-field primitives used by the public apply form, the staff
 * manual-enquiry modal, and the sibling/family multi-student blocks. Kept in
 * its own module so those three call sites can import the renderer without a
 * circular dependency on ApplyForm.
 */
export type PublicField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  is_document_field: boolean;
};

export const INPUT =
  "surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong";

export function FieldWrap({
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

export function FieldRenderer({
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
        <Select
          value={value}
          onChange={onChange}
          options={options.map((o) => ({ value: o, label: o }))}
        />
      </FieldWrap>
    );
  }

  if (type === "date") {
    return (
      <FieldWrap label={label} required={required}>
        <DatePicker value={value} onChange={onChange} />
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

/** Pull the email/phone out of a student's typed values, for dup flagging. */
export function deriveContact(
  fields: PublicField[],
  values: Record<string, string>,
): { email: string | null; phone: string | null } {
  let email: string | null = null;
  let phone: string | null = null;
  for (const f of fields) {
    if (f.type === "email" && values[f.label]) email = values[f.label];
    if (f.type === "phone" && values[f.label]) phone = values[f.label];
  }
  return { email, phone };
}
