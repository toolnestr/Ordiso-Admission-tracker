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

/** Shape each student into the element submit_enquiry_group expects. */
export function toGroupPayload(students: Student[], fields: PublicField[]) {
  return students.map((s) => {
    const { email, phone } = deriveContact(fields, s.values);
    return {
      form_data: s.values,
      email,
      phone,
      program_id: s.programId || null,
    };
  });
}

/**
 * Controlled multi-student entry. Renders one block per student (program +
 * the institute's fields) with add/remove, plus a family/guardian name once a
 * sibling is added. Shared by the public apply form and the staff enquiry
 * modal so both behave identically for single and multi-student cases.
 */
export default function StudentBlocks({
  fields,
  programs,
  isPremium,
  students,
  setStudents,
  familyLabel,
  setFamilyLabel,
}: {
  fields: PublicField[];
  programs: { id: string; name: string }[];
  isPremium: boolean;
  students: Student[];
  setStudents: (next: Student[]) => void;
  familyLabel: string;
  setFamilyLabel: (v: string) => void;
}) {
  const multi = students.length > 1;

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

  return (
    <div className="space-y-5">
      {multi && (
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
          <span className="mt-1 block text-[12px] text-muted">
            Ties these students together so you can see the whole family.
          </span>
        </label>
      )}

      {students.map((s, i) => (
        <div
          key={s.key}
          className={multi ? "rounded-xl border border-border p-4" : ""}
        >
          {multi && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12.5px] font-medium uppercase tracking-wide text-accent">
                Student {i + 1}
              </span>
              {students.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStudent(s.key)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-muted transition-colors hover:text-red-300"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          )}

          <div className="space-y-5">
            {programs.length > 0 && (
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
            )}

            {fields.map((f) => (
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

      <button
        type="button"
        onClick={addStudent}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-[13px] font-medium text-muted-strong transition-colors hover:border-border-strong hover:text-foreground"
      >
        <UserPlus className="h-4 w-4" strokeWidth={1.8} />
        Add another student (sibling)
      </button>
    </div>
  );
}
