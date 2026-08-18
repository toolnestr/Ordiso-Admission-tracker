"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { deleteField, moveField } from "./actions";
import EditFieldDialog, { type FormFieldData } from "./EditFieldDialog";

export default function FieldRowActions({
  field,
  isPremium,
  isFirst,
  isLast,
}: {
  field: FormFieldData;
  isPremium: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => start(() => moveField(field.id, "up"))}
          disabled={pending || isFirst}
          aria-label="Move up"
          className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => start(() => moveField(field.id, "down"))}
          disabled={pending || isLast}
          aria-label="Move down"
          className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          onClick={() => setEditing(true)}
          disabled={pending}
          aria-label="Edit field"
          className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => start(() => deleteField(field.id))}
          disabled={pending}
          aria-label="Delete field"
          className="rounded-md p-1.5 text-muted transition-colors hover:text-red-400 disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <EditFieldDialog
        open={editing}
        onClose={() => setEditing(false)}
        field={field}
        isPremium={isPremium}
      />
    </>
  );
}
