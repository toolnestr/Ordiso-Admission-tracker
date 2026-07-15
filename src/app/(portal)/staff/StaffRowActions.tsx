"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { changeRole, removeStaff, revokeInvite, resendInvite } from "./actions";

export function RoleSelect({
  staffId,
  role,
  disabled,
}: {
  staffId: string;
  role: string;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();
  if (disabled) {
    return <span className="text-[13px] text-muted-strong">{role}</span>;
  }
  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        start(() => changeRole(staffId, next));
      }}
      className="surface-2 rounded-lg px-2 py-1 text-[12.5px] outline-none focus:border-border-strong disabled:opacity-50"
    >
      <option value="Admin">Admin</option>
      <option value="Counselor">Counselor</option>
      <option value="Viewer">Viewer</option>
    </select>
  );
}

export function RemoveButton({
  staffId,
  name,
  isInvite,
}: {
  staffId: string;
  name: string;
  isInvite: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        aria-label={isInvite ? "Revoke invite" : "Remove staff"}
        className="rounded-md p-1.5 text-muted transition-colors hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[12px] text-muted">
        {isInvite ? "Revoke?" : `Remove ${name.split(" ")[0]}?`}
      </span>
      <button
        onClick={() =>
          start(() => (isInvite ? revokeInvite(staffId) : removeStaff(staffId)))
        }
        disabled={pending}
        className="rounded-md bg-red-500/15 px-2 py-1 text-[12px] font-medium text-red-300 disabled:opacity-50"
      >
        {pending ? "…" : "Yes"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-md px-2 py-1 text-[12px] text-muted hover:text-foreground"
      >
        No
      </button>
    </div>
  );
}

export function ResendButton({ staffId }: { staffId: string }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (url) {
    const full = window.location.origin + url;
    return (
      <button
        onClick={() => {
          navigator.clipboard?.writeText(full);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] font-medium text-muted-strong hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        {copied ? "Copied" : "Copy link"}
      </button>
    );
  }

  return (
    <button
      onClick={() =>
        start(async () => {
          const res = await resendInvite(staffId);
          if (res) setUrl(res.inviteUrl);
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] font-medium text-muted-strong transition-colors hover:text-foreground disabled:opacity-50"
    >
      <Link2 className="h-3 w-3" />
      {pending ? "…" : "New link"}
    </button>
  );
}
