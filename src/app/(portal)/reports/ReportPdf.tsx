"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import { sourceLabel } from "@/components/charts/palette";
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

export type FollowUpReportRow = {
  name: string;
  familyLabel: string | null;
  contact: string;
  dueDate: string;
  status: string;
  remark: string | null;
  staffName: string | null;
};

export type ActivityLogReportRow = {
  id: string;
  action_type: string;
  description: string;
  reason: string | null;
  created_at: string;
  staffName: string | null;
  applicantName: string | null;
  applicantId: string | null;
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

function ymdOf(iso: string, tz: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  }
}

function formatTimeInTz(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      timeZone: tz || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return new Date(iso).toLocaleTimeString(undefined, {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
}

function formatDateInTz(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      timeZone: tz || "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return new Date(iso).toLocaleDateString(undefined, {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}

const REPORTS = [
  { key: "audit", label: "Session audit" },
  { key: "admitted", label: "Admitted & confirmed" },
  { key: "rejected", label: "Rejections (with reasons)" },
  { key: "followups", label: "Follow-ups (with remarks)" },
  { key: "monthly_logs", label: "Monthly activity logs (Today & Date-wise)" },
  { key: "all", label: "All applicants" },
] as const;

function fmtYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
  followUps = [],
  activityLogs = [],
  timezone = "UTC",
}: {
  instituteName: string;
  session: SessionMeta;
  totals: Totals;
  rows: ReportRow[];
  followUps?: FollowUpReportRow[];
  activityLogs?: ActivityLogReportRow[];
  timezone?: string;
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
      } else if (kind === "followups") {
        const list = [...followUps].sort(
          (a, b) =>
            a.dueDate.localeCompare(b.dueDate) ||
            (a.familyLabel || a.name).localeCompare(b.familyLabel || b.name),
        );
        autoTable(doc, {
          ...opts,
          columnStyles: { 6: { cellWidth: 42 } },
          head: [
            ["#", "Student", "Family", "Contact", "Due", "Status", "Remark"],
          ],
          body: list.length
            ? list.map((r, i) => [
                String(i + 1),
                r.name,
                r.familyLabel || "—",
                r.contact || "—",
                fmtYmd(r.dueDate),
                r.status,
                r.remark || "—",
              ])
            : [["—", "No follow-ups in this session", "", "", "", "", ""]],
        });
      } else if (kind === "monthly_logs") {
        const todayYmd = ymdOf(new Date().toISOString(), timezone);
        const currentMonthPrefix = todayYmd.slice(0, 7);

        const monthName = new Date().toLocaleDateString(undefined, {
          timeZone: timezone || "UTC",
          month: "long",
          year: "numeric",
        });

        const todayFormatted = new Date().toLocaleDateString(undefined, {
          timeZone: timezone || "UTC",
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        const todayLogs = activityLogs.filter(
          (l) => ymdOf(l.created_at, timezone) === todayYmd,
        );

        const monthLogs = activityLogs.filter(
          (l) => ymdOf(l.created_at, timezone).slice(0, 7) === currentMonthPrefix,
        );

        // Section 1: Today's Activity Logs
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(`1. Today's Activity Logs (${todayFormatted})`, 14, 40);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Total actions recorded today: ${todayLogs.length}`, 14, 46);

        autoTable(doc, {
          startY: 50,
          headStyles,
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 22 },
            2: { cellWidth: 32 },
            3: { cellWidth: 38 },
            4: { cellWidth: 26 },
            5: { cellWidth: "auto" },
          },
          head: [["#", "Time", "Action", "Applicant / Target", "By", "Details & Reason"]],
          body: todayLogs.length
            ? todayLogs.map((l, i) => [
                String(i + 1),
                formatTimeInTz(l.created_at, timezone),
                l.action_type,
                l.applicantName
                  ? `${l.applicantName}${l.applicantId ? ` (${l.applicantId})` : ""}`
                  : "—",
                l.staffName || "System",
                l.reason ? `${l.description}\nReason: ${l.reason}` : l.description,
              ])
            : [["—", "—", "No activity logs recorded for today", "—", "—", "—"]],
        });

        // Section 2: Current Month Date-wise Log Report
        const afterTodayY = (doc as unknown as { lastAutoTable: { finalY: number } })
          .lastAutoTable.finalY;

        let nextY = afterTodayY + 12;
        if (nextY > 250) {
          doc.addPage();
          nextY = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(`2. Current Month Activity Logs (${monthName} — Date-wise)`, 14, nextY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(
          `Total actions recorded in ${monthName}: ${monthLogs.length}`,
          14,
          nextY + 6,
        );

        // Daily Summary Table
        const dateGroups: Record<string, { date: string; count: number; staffSet: Set<string> }> = {};
        for (const l of monthLogs) {
          const ymd = ymdOf(l.created_at, timezone);
          if (!dateGroups[ymd]) {
            dateGroups[ymd] = { date: ymd, count: 0, staffSet: new Set() };
          }
          dateGroups[ymd].count += 1;
          if (l.staffName) dateGroups[ymd].staffSet.add(l.staffName);
        }

        const dateSummaryList = Object.values(dateGroups).sort((a, b) =>
          b.date.localeCompare(a.date),
        );

        autoTable(doc, {
          startY: nextY + 10,
          headStyles: { fillColor: [100, 100, 140], textColor: 255 },
          styles: { fontSize: 8.5, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 35 },
            2: { cellWidth: 30 },
            3: { cellWidth: "auto" },
          },
          head: [["Date", "Day", "Total Actions", "Active Staff"]],
          body: dateSummaryList.length
            ? dateSummaryList.map((g) => {
                const dObj = new Date(g.date + "T12:00:00");
                const dayName = dObj.toLocaleDateString(undefined, { weekday: "long" });
                return [
                  fmtYmd(g.date),
                  dayName,
                  String(g.count),
                  g.staffSet.size > 0 ? Array.from(g.staffSet).join(", ") : "System",
                ];
              })
            : [["—", "—", "0", "No logs recorded for this month"]],
        });

        // Detailed date-wise table
        const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } })
          .lastAutoTable.finalY;

        let nextDetailY = afterSummaryY + 10;
        if (nextDetailY > 250) {
          doc.addPage();
          nextDetailY = 20;
        }

        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50);
        doc.text("Complete Month Detailed Logs:", 14, nextDetailY);

        autoTable(doc, {
          startY: nextDetailY + 4,
          headStyles,
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 32 },
            2: { cellWidth: 38 },
            3: { cellWidth: 26 },
            4: { cellWidth: "auto" },
          },
          head: [["Date & Time", "Action", "Applicant / Target", "By", "Details & Reason"]],
          body: monthLogs.length
            ? monthLogs.map((l) => [
                `${formatDateInTz(l.created_at, timezone)}\n${formatTimeInTz(l.created_at, timezone)}`,
                l.action_type,
                l.applicantName
                  ? `${l.applicantName}${l.applicantId ? ` (${l.applicantId})` : ""}`
                  : "—",
                l.staffName || "System",
                l.reason ? `${l.description}\nReason: ${l.reason}` : l.description,
              ])
            : [["—", "No activity logs recorded for this month", "—", "—", "—"]],
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
            sourceLabel(r.source),
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
        <div className="absolute left-0 z-30 mt-1.5 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border-strong bg-[#12121a] p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.85)] sm:left-auto sm:right-0">
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
