"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Phone,
  MessageCircle,
  FileText,
  CalendarClock,
  ArrowUpRight,
} from "lucide-react";
import { resolveFollowUp } from "@/app/(portal)/applicants/[id]/actions";

export type FollowUpItem = {
  id: string;
  applicantId: string;
  name: string;
  applicationId: string;
  phone: string | null;
  email: string | null;
  applicantStatus: string;
  dueDate: string;
  remark: string | null;
  status: string;
  resolvedAt: string | null;
  staffName: string | null;
};

const TABS = [
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "month", label: "This month" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function fmtDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function FollowUpsView({
  items,
  today,
  initialTab,
  instituteName,
  sessionName,
  canEdit,
}: {
  items: FollowUpItem[];
  today: string;
  initialTab: TabKey;
  instituteName: string;
  sessionName: string;
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [busy, startBusy] = useTransition();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));

  const monthStart = `${today.slice(0, 7)}-01`;

  const counts = useMemo(
    () => ({
      today: items.filter((i) => i.dueDate === today).length,
      overdue: items.filter((i) => i.status !== "Done" && i.dueDate < today)
        .length,
      month: items.filter(
        (i) =>
          i.status !== "Done" &&
          i.dueDate >= monthStart &&
          i.dueDate <= today,
      ).length,
    }),
    [items, today, monthStart],
  );

  const filtered = useMemo(() => {
    const list = items.filter((it) => {
      const pending = it.status !== "Done";
      if (tab === "today") return it.dueDate === today;
      if (tab === "overdue") return pending && it.dueDate < today;
      return pending && it.dueDate >= monthStart && it.dueDate <= today;
    });
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [items, tab, today, monthStart]);

  async function exportPdf(kind: "day" | "month", value: string) {
    setPdfBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      const accent: [number, number, number] = [124, 116, 255];

      // A daily/monthly report is a complete record of that period's remarks —
      // include both pending and done, ordered by due date.
      const list = items
        .filter((i) =>
          kind === "day" ? i.dueDate === value : i.dueDate.slice(0, 7) === value,
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      const label =
        kind === "day"
          ? `Follow-ups — ${fmtDate(value)}`
          : `Follow-ups — ${fmtMonth(value)}`;

      doc.setFontSize(16);
      doc.text(instituteName, 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(`${label} · ${sessionName}`, 14, 25);
      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text(`Generated ${new Date().toLocaleString()} · Ordiso`, 14, 31);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 38,
        headStyles: { fillColor: accent, textColor: 255 },
        styles: { fontSize: 9, cellWidth: "wrap" },
        columnStyles: { 5: { cellWidth: 55 } },
        head: [["#", "Name", "Contact", "Due", "Status", "Remark", "Logged by"]],
        body: list.length
          ? list.map((r, i) => [
              String(i + 1),
              r.name,
              r.phone || r.email || "—",
              fmtDate(r.dueDate),
              r.status,
              r.remark || "—",
              r.staffName || "—",
            ])
          : [["—", "No follow-ups for this period", "", "", "", "", ""]],
      });

      const slug = `${instituteName}-followups-${value}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      doc.save(`${slug}.pdf`);
    } catch (e) {
      console.error("Follow-up PDF export failed", e);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="mt-6">
      {/* Export toolbar */}
      <div className="card-sheen flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-muted">
              Daily report
            </span>
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="surface-2 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-border-strong"
            />
          </label>
          <button
            onClick={() => exportPdf("day", day)}
            disabled={pdfBusy || !day}
            className="surface-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)] disabled:opacity-60"
          >
            <FileText className="h-4 w-4" strokeWidth={1.8} />
            Export day
          </button>
        </div>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-muted">
              Monthly report
            </span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="surface-2 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-border-strong"
            />
          </label>
          <button
            onClick={() => exportPdf("month", month)}
            disabled={pdfBusy || !month}
            className="surface-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)] disabled:opacity-60"
          >
            <FileText className="h-4 w-4" strokeWidth={1.8} />
            Export month
          </button>
        </div>
        {pdfBusy && (
          <span className="text-[12px] text-muted">Preparing PDF…</span>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13.5px] transition-colors ${
              tab === t.key
                ? "border-accent font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 text-[11px] ${
                  t.key === "overdue"
                    ? "bg-red-500/15 text-red-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="card-sheen rounded-2xl px-6 py-14 text-center">
            <CalendarClock
              className="mx-auto h-6 w-6 text-muted"
              strokeWidth={1.5}
            />
            <p className="mt-3 text-[13.5px] text-muted">
              {tab === "today"
                ? "No follow-ups due today."
                : tab === "overdue"
                  ? "Nothing overdue — you're all caught up."
                  : "No pending follow-ups this month."}
            </p>
          </div>
        ) : (
          filtered.map((f) => {
            const done = f.status === "Done";
            const overdue = !done && f.dueDate < today;
            return (
              <div key={f.id} className="card-sheen rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/applicants/${f.applicantId}`}
                        className="inline-flex items-center gap-1 text-[14px] font-medium hover:text-accent"
                      >
                        {f.name}
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
                      </Link>
                      <span className="font-mono text-[11.5px] text-muted">
                        {f.applicationId}
                      </span>
                      {done ? (
                        <span className="badge badge-green">Done</span>
                      ) : overdue ? (
                        <span className="badge badge-red">Overdue</span>
                      ) : (
                        <span className="badge badge-amber">Pending</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
                      <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.7} />
                      Due {fmtDate(f.dueDate)}
                      {f.staffName ? ` · by ${f.staffName}` : ""}
                    </div>
                    {f.remark && (
                      <p className="mt-2 whitespace-pre-wrap text-[13.5px]">
                        {f.remark}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {f.phone && (
                      <>
                        <a
                          href={`https://wa.me/${f.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="WhatsApp"
                          className="surface-2 grid h-8 w-8 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
                        >
                          <MessageCircle className="h-4 w-4" strokeWidth={1.7} />
                        </a>
                        <a
                          href={`tel:${f.phone}`}
                          aria-label="Call"
                          className="surface-2 grid h-8 w-8 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
                        >
                          <Phone className="h-4 w-4" strokeWidth={1.7} />
                        </a>
                      </>
                    )}
                    {canEdit && !done && (
                      <button
                        onClick={() =>
                          startBusy(() =>
                            resolveFollowUp(f.id, f.applicantId),
                          )
                        }
                        disabled={busy}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-40"
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
