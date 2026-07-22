"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";

/**
 * Captures a DOM subtree (by id) to a PNG and downloads it, named
 * `<prefix>-YYYY-MM-DD.png`. Uses modern-screenshot, which serializes the
 * live DOM (fonts + CSS variables inlined) entirely client-side — no upload.
 * The near-black page background is forced so the capture isn't transparent.
 */
export default function ScreenshotButton({
  targetId,
  filePrefix,
}: {
  targetId: string;
  filePrefix: string;
}) {
  const [busy, setBusy] = useState(false);

  async function capture() {
    const node = document.getElementById(targetId);
    if (!node || busy) return;
    setBusy(true);
    try {
      // Imported lazily so the library never lands in the initial bundle.
      const { domToPng } = await import("modern-screenshot");
      const dataUrl = await domToPng(node, {
        scale: 2,
        backgroundColor: "#08080b",
      });
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${filePrefix}-${date}.png`;
      a.click();
    } catch (err) {
      console.error("Screenshot failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={capture}
      disabled={busy}
      className="surface-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)] disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
      ) : (
        <Camera className="h-4 w-4" strokeWidth={1.8} />
      )}
      {busy ? "Capturing…" : "Screenshot"}
    </button>
  );
}
