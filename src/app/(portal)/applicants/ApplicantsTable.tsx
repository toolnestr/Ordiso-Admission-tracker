"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Users2 } from "lucide-react";

export type Applicant = {
  id: string;
  application_id: string;
  form_data: Record<string, unknown> | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  created_at: string;
  family_id: string | null;
  family_label: string | null;
  family_code: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  Applied: "badge-neutral",
  Shortlisted: "badge-accent",
  Interview: "badge-amber",
  Admitted: "badge-blue",
  Confirmed: "badge-green",
  "Confirmed-Partial": "badge-green",
  Rejected: "badge-red",
};

function displayName(
  form_data: Record<string, unknown> | null,
  fallback: string,
) {
  if (form_data) {
    for (const [key, val] of Object.entries(form_data)) {
      if (/name/i.test(key) && typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
  }
  return fallback;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Item =
  | { kind: "solo"; applicant: Applicant; at: number }
  | {
      kind: "family";
      familyId: string;
      label: string | null;
      code: string | null;
      members: Applicant[];
      at: number;
    };

/**
 * Groups siblings (shared family_id) into a single expandable row so a family
 * reads as one line, not N badged rows. Solo applicants render normally. The
 * family row shows the shared tracking code and a per-stage status summary;
 * expanding reveals each child, linking to their full detail.
 */
export default function ApplicantsTable({
  applicants,
}: {
  applicants: Applicant[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Build ordered items: families collapse to one entry positioned at their
  // most recent member; solos keep their own row.
  const families = new Map<string, Applicant[]>();
  for (const a of applicants) {
    if (a.family_id) {
      const arr = families.get(a.family_id) ?? [];
      arr.push(a);
      families.set(a.family_id, arr);
    }
  }

  const items: Item[] = [];
  const seen = new Set<string>();
  for (const a of applicants) {
    if (a.family_id && (families.get(a.family_id)?.length ?? 0) > 1) {
      if (seen.has(a.family_id)) continue;
      seen.add(a.family_id);
      const members = families.get(a.family_id)!;
      items.push({
        kind: "family",
        familyId: a.family_id,
        label: a.family_label,
        code: a.family_code,
        members,
        at: Math.max(...members.map((m) => new Date(m.created_at).getTime())),
      });
    } else {
      items.push({
        kind: "solo",
        applicant: a,
        at: new Date(a.created_at).getTime(),
      });
    }
  }
  items.sort((x, y) => y.at - x.at);

  return (
    <div className="surface overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-border text-[12px] uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Applicant</th>
            <th className="px-4 py-3 font-medium">Applied</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">ID</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
            item.kind === "solo" ? (
              <SoloRow key={item.applicant.id} a={item.applicant} />
            ) : (
              <FamilyRows
                key={item.familyId}
                item={item}
                expanded={!!open[item.familyId]}
                onToggle={() =>
                  setOpen((o) => ({
                    ...o,
                    [item.familyId]: !o[item.familyId],
                  }))
                }
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function SoloRow({ a }: { a: Applicant }) {
  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-surface">
      <td className="px-4 py-3">
        <Link href={`/applicants/${a.id}`} className="block">
          <div className="font-medium hover:text-accent">
            {displayName(a.form_data, a.email || a.phone || "Unknown")}
          </div>
          {a.email && <div className="text-[12px] text-muted">{a.email}</div>}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-strong">{fmtDate(a.created_at)}</td>
      <td className="px-4 py-3">
        <span className={`badge ${STATUS_STYLE[a.status] ?? "badge-neutral"}`}>
          {a.status}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-strong">{a.source}</td>
      <td className="px-4 py-3 font-mono text-[12.5px] text-muted">
        {a.application_id}
      </td>
    </tr>
  );
}

function FamilyRows({
  item,
  expanded,
  onToggle,
}: {
  item: Extract<Item, { kind: "family" }>;
  expanded: boolean;
  onToggle: () => void;
}) {
  // Per-stage summary, e.g. "1 Applied · 1 Admitted".
  const counts: Record<string, number> = {};
  for (const m of item.members) counts[m.status] = (counts[m.status] ?? 0) + 1;
  const summary = Object.entries(counts)
    .map(([s, n]) => `${n} ${s}`)
    .join(" · ");

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border bg-surface/40 transition-colors hover:bg-surface"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            />
            <Users2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.8} />
            <span className="font-medium">
              {item.label || "Family"}
            </span>
            <span className="badge badge-accent">
              {item.members.length} students
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-strong">
          {fmtDate(new Date(item.at).toISOString())}
        </td>
        <td className="px-4 py-3 text-[12.5px] text-muted-strong">{summary}</td>
        <td className="px-4 py-3 text-muted-strong">Family</td>
        <td className="px-4 py-3 font-mono text-[12.5px] text-accent">
          {item.code}
        </td>
      </tr>

      {expanded &&
        item.members.map((m) => (
          <tr
            key={m.id}
            className="border-b border-border bg-background/40 transition-colors last:border-0 hover:bg-surface"
          >
            <td className="py-2.5 pl-12 pr-4">
              <Link href={`/applicants/${m.id}`} className="block">
                <span className="font-medium hover:text-accent">
                  {displayName(m.form_data, m.email || m.phone || "Unknown")}
                </span>
              </Link>
            </td>
            <td className="px-4 py-2.5 text-muted-strong">
              {fmtDate(m.created_at)}
            </td>
            <td className="px-4 py-2.5">
              <span
                className={`badge ${STATUS_STYLE[m.status] ?? "badge-neutral"}`}
              >
                {m.status}
              </span>
            </td>
            <td className="px-4 py-2.5 text-muted-strong">{m.source}</td>
            <td className="px-4 py-2.5 font-mono text-[12.5px] text-muted">
              {m.application_id}
            </td>
          </tr>
        ))}
    </>
  );
}
