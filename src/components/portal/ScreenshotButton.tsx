"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

/**
 * A long, narrow capture (e.g. a full applicant report) is awkward to view and
 * print. When the image is much taller than it is wide, cut it in half and
 * place the two halves side by side so the result reads closer to landscape.
 * Wide captures are returned unchanged.
 */
async function splitIfTall(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const TALL_RATIO = 1.6; // height > 1.6× width → worth splitting
  if (img.height <= img.width * TALL_RATIO) return dataUrl;

  const gap = Math.round(img.width * 0.03);
  const topH = Math.ceil(img.height / 2);
  const bottomH = img.height - topH;

  const canvas = document.createElement("canvas");
  canvas.width = img.width * 2 + gap;
  canvas.height = topH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.fillStyle = "#08080b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Left column = top half, right column = bottom half.
  ctx.drawImage(img, 0, 0, img.width, topH, 0, 0, img.width, topH);
  ctx.drawImage(
    img,
    0,
    topH,
    img.width,
    bottomH,
    img.width + gap,
    0,
    img.width,
    bottomH,
  );
  return canvas.toDataURL("image/png");
}

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
      // Tall captures get cut in half and laid out side by side (landscape).
      const finalUrl = await splitIfTall(dataUrl);
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const a = document.createElement("a");
      a.href = finalUrl;
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
      <span className="hidden sm:inline">
        {busy ? "Capturing…" : "Screenshot"}
      </span>
    </button>
  );
}
