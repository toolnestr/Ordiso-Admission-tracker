"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Phone,
  MessageCircle,
  FileText,
  CalendarClock,
  ArrowUpRight,
  Users2,
} from "lucide-react";
import { resolveFollowUp } from "@/app/(portal)/applicants/[id]/actions";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";

export type FollowUpItem = {
  id: string;
  applicantId: string;
  name: string;
  applicationId: string;
  phone: string | null;
  email: string | null;
  applicantStatus: string;
  familyId: string | null;
  familyLabel: string | null;
  familyCode: string | null;
  dueDate: string;
  remark: string | null;
  status: string;
  resolvedAt: string | null;
  staffName: string | null;
};

const TABS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "month", label: "This month" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

/** Group a follow-up under its family (shared parent/contact) or itself. */
function keyOf(it: FollowUpItem) {
  return it.familyId ?? it.applicantId;
}

type Group = {
  key: string;
  isFamily: boolean;
  title: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  entries: FollowUpItem[];
};

function groupByFamily(items: FollowUpItem[]): Group[] {
  const map = new Map<string, Group>();
  for (const it of items) {
    const key = keyOf(it);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        isFamily: !!it.familyId,
        title: it.familyId ? it.familyLabel || "Family" : it.name,
        code: it.familyId ? it.familyCode : it.applicationId,
        phone: it.phone,
        email: it.email,
        entries: [],
      };
      map.set(key, g);
    }
    g.entries.push(it);
  }
  return [...map.values()];
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
  const [mMonth, setMMonth] = useState(today.slice(5, 7));
  const [mYear, setMYear] = useState(today.slice(0, 4));

  const monthStart = `${today.slice(0, 7)}-01`;
  const curYear = Number(today.slice(0, 4));
  const yearOptions = [curYear - 2, curYear - 1, curYear, curYear + 1].map((y) => ({
    value: String(y),
    label: String(y),
  }));
  const monthOptions = MONTHS.map((m, i) => ({
    value: `${i + 1}`.padStart(2, "0"),
    label: m,
  }));

  function inBucket(it: FollowUpItem, t: TabKey) {
    const pending = it.status !== "Done";
    if (t === "today") return it.dueDate === today;
    if (t === "upcoming") return pending && it.dueDate > today;
    if (t === "overdue") return pending && it.dueDate < today;
    return pending && it.dueDate >= monthStart && it.dueDate <= today;
  }

  // Tab badges count DISTINCT families/applicants (matches the dashboard tiles).
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { today: 0, upcoming: 0, overdue: 0, month: 0 };
    for (const t of ["today", "upcoming", "overdue", "month"] as TabKey[]) {
      c[t] = new Set(items.filter((i) => inBucket(i, t)).map(keyOf)).size;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, today, monthStart]);

  const groups = useMemo(() => {
    const filtered = items
      .filter((it) => inBucket(it, tab))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return groupByFamily(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, tab, today, monthStart]);

  async function exportPdf(kind: "day" | "month", value: string) {
    setPdfBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      const accent: [number, number, number] = [124, 116, 255];

      const list = items
        .filter((i) =>
          kind === "day" ? i.dueDate === value : i.dueDate.slice(0, 7) === value,
        )
        .sort(
          (a, b) =>
            a.dueDate.localeCompare(b.dueDate) ||
            (a.familyLabel || a.name).localeCompare(b.familyLabel || b.name),
        );

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
        columnStyles: { 6: { cellWidth: 45 } },
        head: [
          ["#", "Student", "Family", "Contact", "Due", "Status", "Remark"],
        ],
        body: list.length
          ? list.map((r, i) => [
              String(i + 1),
              r.name,
              r.familyLabel || "—",
              r.phone || r.email || "—",
              fmtDate(r.dueDate),
              r.status,
              r.remark || "—",
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
      {/* Export toolbar — stacks on mobile, inline on sm+ */}
      <div className="card-sheen space-y-3 rounded-2xl p-4 sm:flex sm:flex-wrap sm:items-end sm:gap-4 sm:space-y-0">
        <div>
          <span className="mb-1.5 block text-[12px] text-muted">
            Daily report
          </span>
          <div className="flex items-end gap-2">
            <div className="flex-1 sm:w-[160px] sm:flex-none">
              <DatePicker value={day} onChange={setDay} />
            </div>
            <button
              onClick={() => exportPdf("day", day)}
              disabled={pdfBusy || !day}
              className="surface-2 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)] disabled:opacity-60"
            >
              <FileText className="h-4 w-4" strokeWidth={1.8} />
              Export
            </button>
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-[12px] text-muted">
            Monthly report
          </span>
          <div className="flex items-end gap-2">
            <div className="flex-1 sm:w-[124px] sm:flex-none">
              <Select value={mMonth} onChange={setMMonth} options={monthOptions} />
            </div>
            <div className="w-[84px] shrink-0">
              <Select value={mYear} onChange={setMYear} options={yearOptions} />
            </div>
            <button
              onClick={() => exportPdf("month", `${mYear}-${mMonth}`)}
              disabled={pdfBusy}
              className="surface-2 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)] disabled:opacity-60"
            >
              <FileText className="h-4 w-4" strokeWidth={1.8} />
              Export
            </button>
          </div>
        </div>
        {pdfBusy && (
          <span className="text-[12px] text-muted sm:self-center">
            Preparing PDF…
          </span>
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
                    : t.key === "upcoming"
                      ? "bg-accent-soft text-accent"
                      : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      <div className="mt-4 space-y-2.5">
        {groups.length === 0 ? (
          <div className="card-sheen rounded-2xl px-6 py-14 text-center">
            <CalendarClock
              className="mx-auto h-6 w-6 text-muted"
              strokeWidth={1.5}
            />
            <p className="mt-3 text-[13.5px] text-muted">
              {tab === "today"
                ? "No follow-ups due today."
                : tab === "upcoming"
                  ? "No follow-ups scheduled ahead."
                  : tab === "overdue"
                    ? "Nothing overdue — you're all caught up."
                    : "No pending follow-ups this month."}
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="card-sheen rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {g.isFamily && (
                      <Users2 className="h-4 w-4 text-accent" strokeWidth={1.8} />
                    )}
                    {g.isFamily ? (
                      <span className="text-[14px] font-medium">
                        {g.title} family
                      </span>
                    ) : (
                      <Link
                        href={`/applicants/${g.entries[0].applicantId}`}
                        className="inline-flex items-center gap-1 text-[14px] font-medium hover:text-accent"
                      >
                        {g.title}
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
                      </Link>
                    )}
                    {g.code && (
                      <span className="font-mono text-[11.5px] text-muted">
                        {g.code}
                      </span>
                    )}
                    {g.isFamily && (
                      <span className="text-[11.5px] text-muted">
                        · {g.entries.length} follow-up
                        {g.entries.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  {/* Entries */}
                  <div className="mt-2 space-y-2">
                    {g.entries.map((f) => {
                      const done = f.status === "Done";
                      const overdue = !done && f.dueDate < today;
                      return (
                        <div
                          key={f.id}
                          className="rounded-lg border border-border px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <CalendarClock
                              className="h-3.5 w-3.5 text-muted"
                              strokeWidth={1.7}
                            />
                            <span className="text-[12.5px]">
                              {fmtDate(f.dueDate)}
                            </span>
                            {done ? (
                              <span className="badge badge-green">Done</span>
                            ) : overdue ? (
                              <span className="badge badge-red">Overdue</span>
                            ) : (
                              <span className="badge badge-amber">Pending</span>
                            )}
                            {g.isFamily && (
                              <Link
                                href={`/applicants/${f.applicantId}`}
                                className="text-[11.5px] text-muted hover:text-accent"
                              >
                                · {f.name}
                              </Link>
                            )}
                            {canEdit && !done && (
                              <button
                                onClick={() =>
                                  startBusy(() =>
                                    resolveFollowUp(f.id, f.applicantId),
                                  )
                                }
                                disabled={busy}
                                className="ml-auto rounded-md px-2 py-0.5 text-[11.5px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-40"
                              >
                                Mark done
                              </button>
                            )}
                          </div>
                          {f.remark && (
                            <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-muted-strong">
                              {f.remark}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shared contact */}
                {g.phone && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <a
                      href={`https://wa.me/${g.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="surface-2 grid h-8 w-8 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={1.7} />
                    </a>
                    <a
                      href={`tel:${g.phone}`}
                      aria-label="Call"
                      className="surface-2 grid h-8 w-8 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
                    >
                      <Phone className="h-4 w-4" strokeWidth={1.7} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
