"use client";

import { useTransition } from "react";
import { closeSession, reopenSession } from "./actions";

export function CloseButton({ sessionId }: { sessionId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => closeSession(sessionId))}
      disabled={pending}
      className="rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-muted-strong transition-colors hover:text-foreground disabled:opacity-50"
    >
      {pending ? "Closing…" : "Close"}
    </button>
  );
}

export function ReopenButton({
  sessionId,
  disabled,
}: {
  sessionId: string;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => reopenSession(sessionId))}
      disabled={pending || disabled}
      title={disabled ? "Close the open session first" : undefined}
      className="rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-muted-strong transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Reopening…" : "Reopen"}
    </button>
  );
}
