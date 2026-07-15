"use client";

import { useTransition } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { deleteField, moveField } from "./actions";

export default function FieldRowActions({
  fieldId,
  isFirst,
  isLast,
}: {
  fieldId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => start(() => moveField(fieldId, "up"))}
        disabled={pending || isFirst}
        aria-label="Move up"
        className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => start(() => moveField(fieldId, "down"))}
        disabled={pending || isLast}
        aria-label="Move down"
        className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        onClick={() => start(() => deleteField(fieldId))}
        disabled={pending}
        aria-label="Delete field"
        className="rounded-md p-1.5 text-muted transition-colors hover:text-red-400 disabled:opacity-30"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
