"use client";

import { UserPlus, X } from "lucide-react";
import Select from "@/components/ui/Select";
import { FieldRenderer, type PublicField, deriveContact } from "./fields";

export type Student = {
  key: string;
  programId: string;
  values: Record<string, string>;
};

let seq = 0;
export function newStudent(): Student {
  seq += 1;
  return { key: `s${seq}`, programId: "", values: {} };
}

/** Contact fields (email/phone) are shared across siblings — one guardian. */
export function isSharedField(f: PublicField) {
  return f.type === "email" || f.type === "phone";
}

/**
 * Shape each student for submit_enquiry_group. The shared contact values are
 * merged into every child so each applicant still carries the family's email
 * and phone (used for status lookup + duplicate flagging).
 */
export function toGroupPayload(
  students: Student[],
  fields: PublicField[],
  shared: Record<string, string>,
) {
  return students.map((s) => {
    const values = { ...s.values, ...shared };
    const { email, phone } = deriveContact(fields, values);
    return { form_data: values, email, phone, program_id: s.programId || null };
  });
}

/** Merge a single student's values with the shared contact (single-submit path). */
export function mergedValues(student: Student, shared: Record<string, string>) {
  return { ...student.values, ...shared };
}

export default function StudentBlocks({
  fields,
  programs,
  isPremium,
  students,
  setStudents,
  shared,
  setShared,
  familyLabel,
  setFamilyLabel,
}: {
  fields: PublicField[];
  programs: { id: string; name: string }[];
  isPremium: boolean;
  students: Student[];
  setStudents: (next: Student[]) => void;
  shared: Record<string, string>;
  setShared: (next: Record<string, string>) => void;
  familyLabel: string;
  setFamilyLabel: (v: string) => void;
}) {
  const multi = students.length > 1;
  const sharedFields = fields.filter(isSharedField);
  const childFields = fields.filter((f) => !isSharedField(f));

  function update(key: string, patch: Partial<Student>) {
    setStudents(students.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }
  function setValue(key: string, label: string, v: string) {
    const s = students.find((x) => x.key === key);
    if (!s) return;
    update(key, { values: { ...s.values, [label]: v } });
  }
  function addStudent() {
    setStudents([...students, newStudent()]);
  }
  function removeStudent(key: string) {
    setStudents(students.filter((s) => s.key !== key));
  }

  function programSelect(s: Student) {
    if (programs.length === 0) return null;
    return (
      <label className="block">
        <span className="mb-1.5 block text-[13.5px] font-medium text-muted-strong">
          Program<span className="ml-0.5 text-accent">*</span>
        </span>
        <Select
          value={s.programId}
          onChange={(v) => update(s.key, { programId: v })}
          placeholder="Select a program…"
          options={programs.map((p) => ({ value: p.id, label: p.name }))}
        />
      </label>
    );
  }

  const sharedBlock = sharedFields.map((f) => (
    <FieldRenderer
      key={f.id}
      field={f}
      value={shared[f.label] ?? ""}
      onChange={(v) => setShared({ ...shared, [f.label]: v })}
      locked={false}
    />
  ));

  // ---- Single student: one plain block, contact inline (unchanged UX) ----
  if (!multi) {
    const s = students[0];
    return (
      <div className="space-y-5">
        {programSelect(s)}
        {sharedBlock}
        {childFields.map((f) => (
          <FieldRenderer
            key={f.id}
            field={f}
            value={s.values[f.label] ?? ""}
            onChange={(v) => setValue(s.key, f.label, v)}
            locked={f.is_document_field && !isPremium}
          />
        ))}
        <AddButton onClick={addStudent} />
      </div>
    );
  }

  // ---- Multiple students: shared contact once, then a block per child ----
  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-[13.5px] font-medium text-muted-strong">
          Family / guardian name
        </span>
        <input
          value={familyLabel}
          onChange={(e) => setFamilyLabel(e.target.value)}
          placeholder="e.g. Khan family"
          className="surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
        />
      </label>

      {sharedFields.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 text-[12.5px] font-medium uppercase tracking-wide text-accent">
            Shared contact
          </div>
          <div className="space-y-5">{sharedBlock}</div>
          <p className="mt-2 text-[12px] text-muted">
            Entered once — used for every student in this family.
          </p>
        </div>
      )}

      {students.map((s, i) => (
        <div key={s.key} className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12.5px] font-medium uppercase tracking-wide text-accent">
              Student {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeStudent(s.key)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-muted transition-colors hover:text-red-300"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
          <div className="space-y-5">
            {programSelect(s)}
            {childFields.map((f) => (
              <FieldRenderer
                key={f.id}
                field={f}
                value={s.values[f.label] ?? ""}
                onChange={(v) => setValue(s.key, f.label, v)}
                locked={f.is_document_field && !isPremium}
              />
            ))}
          </div>
        </div>
      ))}

      <AddButton onClick={addStudent} />
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-[13px] font-medium text-muted-strong transition-colors hover:border-border-strong hover:text-foreground"
    >
      <UserPlus className="h-4 w-4" strokeWidth={1.8} />
      Add another student (sibling)
    </button>
  );
}
