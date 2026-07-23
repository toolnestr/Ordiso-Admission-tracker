"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";

/**
 * mailto: only works when the machine has a desktop mail client configured,
 * which many don't — so it looked broken. This opens Gmail's compose window
 * pre-addressed (works in any browser) and copies the address as a fallback.
 */
export default function EmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  function onClick() {
    navigator.clipboard?.writeText(email).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <button
      onClick={onClick}
      title={copied ? "Address copied" : email}
      aria-label="Email"
      className="surface-2 grid h-9 w-9 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" strokeWidth={1.8} />
      ) : (
        <Mail className="h-4 w-4" strokeWidth={1.7} />
      )}
    </button>
  );
}
