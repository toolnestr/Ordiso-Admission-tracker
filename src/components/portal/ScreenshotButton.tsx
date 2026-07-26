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

// Page background (#08080b). A row made almost entirely of this colour is a
// gap between cards — a safe place to cut without slicing through a chart.
const BG = { r: 8, g: 8, b: 11 };

/** Is image row `y` (almost) all background — i.e. a gap between elements? */
function isGapRow(data: Uint8ClampedArray, width: number, y: number): boolean {
  const step = Math.max(1, Math.floor(width / 220));
  let nonBg = 0;
  for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4;
    if (
      Math.abs(data[i] - BG.r) > 14 ||
      Math.abs(data[i + 1] - BG.g) > 14 ||
      Math.abs(data[i + 2] - BG.b) > 14
    ) {
      if (++nonBg > 2) return false; // content on this row
    }
  }
  return true;
}

/**
 * A long, narrow capture (e.g. a full report) is awkward to view and print.
 * When the image is much taller than it is wide, cut it near the middle — at a
 * background gap between cards, never through a chart — and place the two
 * halves side by side (landscape). Wide captures are returned unchanged.
 */
async function splitIfTall(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const W = img.width;
  const H = img.height;
  if (H <= W * 1.6) return dataUrl;

  const src = document.createElement("canvas");
  src.width = W;
  src.height = H;
  const sctx = src.getContext("2d");
  if (!sctx) return dataUrl;
  sctx.drawImage(img, 0, 0);
  const data = sctx.getImageData(0, 0, W, H).data;

  // Start at the midpoint and walk outward to the nearest gap row so the cut
  // lands between cards rather than across one.
  const mid = Math.floor(H / 2);
  const window = Math.floor(H * 0.3);
  let cut = mid;
  for (let d = 0; d <= window; d++) {
    if (isGapRow(data, W, mid + d)) {
      cut = mid + d;
      break;
    }
    if (isGapRow(data, W, mid - d)) {
      cut = mid - d;
      break;
    }
  }

  const topH = cut;
  const bottomH = H - cut;
  const gap = Math.round(W * 0.03);
  const canvas = document.createElement("canvas");
  canvas.width = W * 2 + gap;
  canvas.height = Math.max(topH, bottomH);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.fillStyle = "#08080b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Left column = top half, right column = bottom half.
  ctx.drawImage(img, 0, 0, W, topH, 0, 0, W, topH);
  ctx.drawImage(img, 0, cut, W, bottomH, W + gap, 0, W, bottomH);
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
        // Skip anything marked data-screenshot-exclude (e.g. the dashboard's
        // "Free tier usage" / "Quick actions" cards — not useful in a share).
        filter: (n) =>
          !(n instanceof HTMLElement && n.hasAttribute("data-screenshot-exclude")),
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
