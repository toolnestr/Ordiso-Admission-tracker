"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, MessageCircle, Mail } from "lucide-react";

export default function ShareTools({
  url,
  instituteName,
}: {
  url: string;
  instituteName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 220,
        margin: 1,
        color: { dark: "#111118", light: "#ffffff" },
      });
    }
  }, [url]);

  function copy() {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${instituteName.replace(/\s+/g, "-").toLowerCase()}-application-qr.png`;
    a.click();
  }

  const waText = encodeURIComponent(
    `Apply to ${instituteName} — fill our application form here: ${url}`,
  );
  const emailBody = encodeURIComponent(
    `Apply to ${instituteName} using our online application form:\n\n${url}\n\nSave the Application ID you receive to track your status.`,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Link + shares */}
      <div className="card-sheen rounded-2xl p-5">
        <h3 className="text-[14px] font-medium">Your application link</h3>
        <p className="mt-1 text-[13px] text-muted">
          This link never changes, even if you rename your institute.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="surface-2 min-w-0 flex-1 rounded-lg px-3 py-2.5 text-[13px] text-muted-strong outline-none"
          />
          <button
            onClick={copy}
            className="surface-2 flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="surface flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors hover:border-border-strong"
          >
            <MessageCircle className="h-4 w-4 text-accent" strokeWidth={1.7} />
            Share on WhatsApp
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(`Apply to ${instituteName}`)}&body=${emailBody}`}
            className="surface flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors hover:border-border-strong"
          >
            <Mail className="h-4 w-4 text-accent" strokeWidth={1.7} />
            Share by email
          </a>
        </div>
      </div>

      {/* QR */}
      <div className="card-sheen flex flex-col items-center rounded-2xl p-5">
        <h3 className="self-start text-[14px] font-medium">QR code</h3>
        <div className="mt-4 rounded-xl bg-white p-3">
          <canvas ref={canvasRef} />
        </div>
        <button
          onClick={downloadPng}
          className="surface-2 mt-4 flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
        >
          <Download className="h-4 w-4" strokeWidth={1.8} />
          Download PNG
        </button>
      </div>
    </div>
  );
}
