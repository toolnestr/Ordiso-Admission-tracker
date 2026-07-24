"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import type { SessionMeta, Totals } from "./page";

export type ReportRow = {
  application_id: string;
  form_data: Record<string, unknown> | null;
  status: string;
  source: string;
  created_at: string;
  confirmed_at: string | null;
  confirmation_reason: string | null;
  rejection_reason: string | null;
  programs: { name: string } | { name: string }[] | null;
};

function nameOf(r: ReportRow) {
  const fd = r.form_data;
  if (fd) {
    for (const [k, v] of Object.entries(fd)) {
      if (/name/i.test(k) && typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return r.application_id;
}
function programOf(r: ReportRow) {
  const p = Array.isArray(r.programs) ? r.programs[0] : r.programs;
  return p?.name ?? "—";
}
function d(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}

const REPORTS = [
  { key: "audit", label: "Session audit" },
  { key: "admitted", label: "Admitted & confirmed" },
  { key: "rejected", label: "Rejections (with reasons)" },
  { key: "all", label: "All applicants" },
] as const;

type ReportKey = (typeof REPORTS)[number]["key"];

/**
 * Client-side PDF export (jsPDF + autotable, lazy-loaded). Builds branded,
 * tabular reports from the selected session's applicants — no server render,
 * so it works on Cloudflare Workers.
 */
export default function ReportPdf({
  instituteName,
  session,
  totals,
  rows,
}: {
  instituteName: string;
  session: SessionMeta;
  totals: Totals;
  rows: ReportRow[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function generate(kind: ReportKey) {
    setOpen(false);
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      const accent: [number, number, number] = [124, 116, 255];

      const title = REPORTS.find((r) => r.key === kind)!.label;
      doc.setFontSize(16);
      doc.text(instituteName, 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(`${title} — ${session.name}`, 14, 25);
      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text(
        `Generated ${new Date().toLocaleString()} · Ordiso`,
        14,
        31,
      );
      doc.setTextColor(0);

      const headStyles = { fillColor: accent, textColor: 255 };
      const opts = { startY: 38, headStyles, styles: { fontSize: 9 } };

      if (kind === "audit") {
        autoTable(doc, {
          ...opts,
          head: [["Metric", "Value"]],
          body: [
            ["Total applicants", String(totals.total)],
            ["Admitted", String(totals.admitted)],
            ["Confirmed", String(totals.confirmed)],
            [
              "Conversion",
              `${totals.total ? Math.round((totals.confirmed / totals.total) * 100) : 0}%`,
            ],
            ["Session window", `${d(session.start_date)} – ${d(session.end_date)}`],
          ],
        });
        const byStage = Object.entries(totals.byStatus).map(([s, n]) => [
          s,
          String(n),
        ]);
        autoTable(doc, {
          startY: (doc as unknown as { lastAutoTable: { finalY: number } })
            .lastAutoTable.finalY + 8,
          headStyles,
          styles: { fontSize: 9 },
          head: [["Stage", "Applicants"]],
          body: byStage.length ? byStage : [["—", "0"]],
        });
        const bySource = Object.entries(totals.bySource).map(([s, n]) => [
          s,
          String(n),
        ]);
        autoTable(doc, {
          startY: (doc as unknown as { lastAutoTable: { finalY: number } })
            .lastAutoTable.finalY + 8,
          headStyles,
          styles: { fontSize: 9 },
          head: [["Source", "Applicants"]],
          body: bySource.length ? bySource : [["—", "0"]],
        });
      } else if (kind === "admitted") {
        const list = rows.filter(
          (r) => r.status === "Admitted" || r.status.startsWith("Confirmed"),
        );
        autoTable(doc, {
          ...opts,
          head: [["#", "Name", "Program", "Status", "Confirmed"]],
          body: list.map((r, i) => [
            String(i + 1),
            nameOf(r),
            programOf(r),
            r.status,
            d(r.confirmed_at),
          ]),
        });
      } else if (kind === "rejected") {
        const list = rows.filter((r) => r.status === "Rejected");
        autoTable(doc, {
          ...opts,
          head: [["#", "Name", "Program", "Reason", "Date"]],
          body: list.map((r, i) => [
            String(i + 1),
            nameOf(r),
            programOf(r),
            r.rejection_reason || "—",
            d(r.created_at),
          ]),
        });
      } else {
        autoTable(doc, {
          ...opts,
          head: [["ID", "Name", "Program", "Status", "Source", "Applied"]],
          body: rows.map((r) => [
            r.application_id,
            nameOf(r),
            programOf(r),
            r.status,
            r.source,
            d(r.created_at),
          ]),
        });
      }

      const slug = `${instituteName}-${session.name}-${title}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      doc.save(`${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="surface-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)] disabled:opacity-60"
      >
        <FileText className="h-4 w-4" strokeWidth={1.8} />
        {busy ? "Preparing…" : "PDF report"}
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-border-strong bg-[#12121a] p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.85)]">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => generate(r.key)}
              className="block w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-2"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
