"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { AlertCircle, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import { FREE_STAFF_SEATS, FREE_TIER_CAP } from "@/lib/limits";
import {
  updateProfile,
  updateStatusMessages,
  addProgram,
  deleteProgram,
  addFeeTemplate,
  deleteFeeTemplate,
  deactivateInstitute,
  type SettingsState,
} from "./actions";

const initial: SettingsState = { error: null };

/** Symbol is what gets stored — it's what renders next to every amount. */
const CURRENCIES: { value: string; label: string; description: string }[] = [
  { value: "$", label: "$", description: "US Dollar (USD)" },
  { value: "€", label: "€", description: "Euro (EUR)" },
  { value: "£", label: "£", description: "British Pound (GBP)" },
  { value: "¥", label: "¥", description: "Japanese Yen (JPY)" },
  { value: "CN¥", label: "CN¥", description: "Chinese Yuan (CNY)" },
  { value: "₹", label: "₹", description: "Indian Rupee (INR)" },
  { value: "Rs.", label: "Rs.", description: "Rupee (PKR / LKR / NPR)" },
  { value: "₨", label: "₨", description: "Rupee symbol" },
  { value: "৳", label: "৳", description: "Bangladeshi Taka (BDT)" },
  { value: "A$", label: "A$", description: "Australian Dollar (AUD)" },
  { value: "C$", label: "C$", description: "Canadian Dollar (CAD)" },
  { value: "NZ$", label: "NZ$", description: "New Zealand Dollar (NZD)" },
  { value: "CHF ", label: "CHF", description: "Swiss Franc (CHF)" },
  { value: "AED ", label: "AED", description: "UAE Dirham (AED)" },
  { value: "SAR ", label: "SAR", description: "Saudi Riyal (SAR)" },
  { value: "QAR ", label: "QAR", description: "Qatari Riyal (QAR)" },
  { value: "₺", label: "₺", description: "Turkish Lira (TRY)" },
  { value: "R", label: "R", description: "South African Rand (ZAR)" },
  { value: "₦", label: "₦", description: "Nigerian Naira (NGN)" },
  { value: "KSh ", label: "KSh", description: "Kenyan Shilling (KES)" },
  { value: "E£", label: "E£", description: "Egyptian Pound (EGP)" },
  { value: "GH₵", label: "GH₵", description: "Ghanaian Cedi (GHS)" },
  { value: "R$", label: "R$", description: "Brazilian Real (BRL)" },
  { value: "MX$", label: "MX$", description: "Mexican Peso (MXN)" },
  { value: "S$", label: "S$", description: "Singapore Dollar (SGD)" },
  { value: "RM", label: "RM", description: "Malaysian Ringgit (MYR)" },
  { value: "Rp", label: "Rp", description: "Indonesian Rupiah (IDR)" },
  { value: "₱", label: "₱", description: "Philippine Peso (PHP)" },
  { value: "฿", label: "฿", description: "Thai Baht (THB)" },
  { value: "₫", label: "₫", description: "Vietnamese Dong (VND)" },
  { value: "₩", label: "₩", description: "South Korean Won (KRW)" },
  { value: "zł", label: "zł", description: "Polish Zloty (PLN)" },
  { value: "kr", label: "kr", description: "Scandinavian Krone/Krona" },
];

/**
 * Full IANA timezone list from the browser — a hardcoded shortlist can't serve
 * a global product. Falls back to a small set on older browsers that lack
 * Intl.supportedValuesOf.
 */
function useTimezones() {
  return useMemo(() => {
    let zones: string[] = [];
    try {
      const intl = Intl as typeof Intl & {
        supportedValuesOf?: (k: string) => string[];
      };
      zones = intl.supportedValuesOf?.("timeZone") ?? [];
    } catch {
      zones = [];
    }
    if (zones.length === 0) {
      zones = [
        "UTC",
        "Europe/London",
        "Europe/Berlin",
        "America/New_York",
        "America/Los_Angeles",
        "Asia/Dubai",
        "Asia/Singapore",
        "Australia/Sydney",
      ];
    }
    return [
      { value: "UTC", label: "UTC" },
      ...zones
        .filter((z) => z !== "UTC")
        .map((z) => ({ value: z, label: z.replace(/_/g, " ") })),
    ];
  }, []);
}

const STAGES = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Admitted",
  "Confirmed",
  "Rejected",
];

const TABS = ["Profile", "Programs", "Fees", "Status page", "Plan"] as const;
type Tab = (typeof TABS)[number];

type Institute = {
  display_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  working_hours: string | null;
  currency: string;
  timezone: string;
  plan: string;
  status_page_messages: Record<string, string>;
};

export default function SettingsSections({
  institute,
  programs,
  feeTemplates,
  usage,
}: {
  institute: Institute;
  programs: { id: string; name: string }[];
  feeTemplates: {
    id: string;
    name: string;
    default_amount: number;
    programs: { name: string } | null;
  }[];
  usage: { applicants: number; seats: number };
}) {
  const [tab, setTab] = useState<Tab>("Profile");

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13.5px] transition-colors ${
              tab === t
                ? "border-accent font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === "Profile" && <ProfileSection institute={institute} />}
        {tab === "Programs" && <ProgramsSection programs={programs} />}
        {tab === "Fees" && (
          <FeesSection
            templates={feeTemplates}
            programs={programs}
            currency={institute.currency}
          />
        )}
        {tab === "Status page" && (
          <StatusMessagesSection messages={institute.status_page_messages} />
        )}
        {tab === "Plan" && (
          <PlanSection
            plan={institute.plan}
            usage={usage}
            instituteName={institute.display_name}
          />
        )}
      </div>
    </div>
  );
}

function ProfileSection({ institute }: { institute: Institute }) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const [currency, setCurrency] = useState(institute.currency);
  const [timezone, setTimezone] = useState(institute.timezone);
  const timezones = useTimezones();

  return (
    <form action={action} className="card-sheen max-w-2xl rounded-2xl p-6">
      <h3 className="text-[15px] font-medium">Institute profile</h3>
      <p className="mt-1 text-[13px] text-muted">
        Your name shows on the public form. Renaming never breaks your
        application link or printed QR codes.
      </p>

      <div className="mt-5 space-y-4">
        <Text label="Institute name" name="display_name" defaultValue={institute.display_name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="Contact email" name="contact_email" type="email" defaultValue={institute.contact_email ?? ""} />
          <Text label="Contact phone" name="contact_phone" defaultValue={institute.contact_phone ?? ""} />
        </div>
        <Text label="Address" name="address" defaultValue={institute.address ?? ""} />
        <Text
          label="Office hours"
          name="working_hours"
          placeholder="e.g. Mon–Sat, 9 AM–5 PM"
          defaultValue={institute.working_hours ?? ""}
          hint="Shown to applicants so they know when to expect a reply."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
              Currency
            </span>
            <Select
              name="currency"
              value={currency}
              onChange={setCurrency}
              options={CURRENCIES}
              searchable
            />
            <p className="mt-1.5 text-[12px] text-muted">Used across all fee displays.</p>
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
              Timezone
            </span>
            <Select
              name="timezone"
              value={timezone}
              onChange={setTimezone}
              options={timezones}
              searchable
            />
            <p className="mt-1.5 text-[12px] text-muted">Controls when sessions auto-close.</p>
          </div>
        </div>
      </div>

      <Feedback state={state} />
      <SaveButton pending={pending} />
    </form>
  );
}

function ProgramsSection({ programs }: { programs: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addProgram, initial);
  const [deleting, startDelete] = useTransition();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card-sheen rounded-2xl p-6">
        <h3 className="text-[15px] font-medium">Programs & courses</h3>
        <p className="mt-1 text-[13px] text-muted">
          Programs appear as a dropdown on your application form and can each
          carry their own fees.
        </p>

        {programs.length > 0 ? (
          <div className="surface mt-5 overflow-hidden rounded-xl">
            {programs.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0"
              >
                <span className="text-[13.5px]">{p.name}</span>
                <button
                  onClick={() => startDelete(() => deleteProgram(p.id))}
                  disabled={deleting}
                  aria-label={`Delete ${p.name}`}
                  className="rounded-md p-1.5 text-muted transition-colors hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted">
            No programs yet. Add one if you offer more than a single course.
          </p>
        )}

        <form action={action} className="mt-4 flex items-end gap-2">
          <label className="flex-1">
            <span className="text-[13px] font-medium text-muted-strong">
              Add a program
            </span>
            <input
              name="name"
              required
              placeholder="e.g. Computer Science"
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2.5 text-[13px] font-medium text-background disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            {pending ? "Adding…" : "Add"}
          </button>
        </form>
        <Feedback state={state} />
      </div>
    </div>
  );
}

function FeesSection({
  templates,
  programs,
  currency,
}: {
  templates: {
    id: string;
    name: string;
    default_amount: number;
    programs: { name: string } | null;
  }[];
  programs: { id: string; name: string }[];
  currency: string;
}) {
  const [state, action, pending] = useActionState(addFeeTemplate, initial);
  const [programId, setProgramId] = useState("");
  const [deleting, startDelete] = useTransition();

  const programOptions = [
    { value: "", label: "All programs" },
    ...programs.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="card-sheen max-w-2xl rounded-2xl p-6">
      <h3 className="text-[15px] font-medium">Fee structure</h3>
      <p className="mt-1 text-[13px] text-muted">
        Reusable defaults. Adding a fee here doesn&apos;t charge anyone — you
        assign fees per applicant, and can override the amount then.
      </p>

      {templates.length > 0 ? (
        <div className="surface mt-5 overflow-hidden rounded-xl">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0"
            >
              <div>
                <span className="text-[13.5px]">{t.name}</span>
                <span className="ml-2 text-[12px] text-muted">
                  {t.programs?.name ?? "All programs"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13.5px] tabular-nums">
                  {currency}
                  {t.default_amount}
                </span>
                <button
                  onClick={() => startDelete(() => deleteFeeTemplate(t.id))}
                  disabled={deleting}
                  aria-label={`Delete ${t.name}`}
                  className="rounded-md p-1.5 text-muted transition-colors hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted">
          No fee types yet.
        </p>
      )}

      <form action={action} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-[13px] font-medium text-muted-strong">Fee name</span>
            <input
              name="name"
              required
              placeholder="e.g. Admission fee"
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-muted-strong">
              Amount ({currency})
            </span>
            <input
              name="default_amount"
              type="number"
              min={1}
              step="0.01"
              required
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
              Applies to
            </span>
            <Select
              name="program_id"
              value={programId}
              onChange={setProgramId}
              options={programOptions}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2.5 text-[13px] font-medium text-background disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          {pending ? "Adding…" : "Add fee type"}
        </button>
      </form>
      <Feedback state={state} />
    </div>
  );
}

function StatusMessagesSection({ messages }: { messages: Record<string, string> }) {
  const [state, action, pending] = useActionState(updateStatusMessages, initial);

  return (
    <form action={action} className="card-sheen max-w-2xl rounded-2xl p-6">
      <h3 className="text-[15px] font-medium">Status page messages</h3>
      <p className="mt-1 text-[13px] text-muted">
        What applicants see when they check their status. Leave blank to show
        just the stage name.
      </p>

      <div className="mt-5 space-y-3">
        {STAGES.map((s) => (
          <label key={s} className="block">
            <span className="text-[13px] font-medium text-muted-strong">{s}</span>
            <input
              name={`msg_${s}`}
              defaultValue={messages?.[s] ?? ""}
              placeholder={
                s === "Applied"
                  ? "Thank you for applying! We'll be in touch soon."
                  : s === "Confirmed"
                    ? "Congratulations — your admission is confirmed!"
                    : `Message shown at ${s}`
              }
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
        ))}
      </div>

      <Feedback state={state} />
      <SaveButton pending={pending} />
    </form>
  );
}

function PlanSection({
  plan,
  usage,
  instituteName,
}: {
  plan: string;
  usage: { applicants: number; seats: number };
  instituteName: string;
}) {
  const isFree = plan === "Free";
  return (
    <div className="max-w-2xl space-y-4">
      <div className="card-sheen rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-medium">Current plan</h3>
            <p className="mt-1 text-[13px] text-muted">
              {isFree
                ? "Free forever — upgrade when you outgrow it."
                : "Thanks for being a Premium institute."}
            </p>
          </div>
          <span className={`badge ${isFree ? "badge-neutral" : "badge-accent"}`}>
            {plan}
          </span>
        </div>

        {isFree && (
          <div className="mt-5 space-y-4">
            <Meter
              label="Applicants this session"
              value={usage.applicants}
              max={FREE_TIER_CAP}
            />
            <Meter label="Staff seats" value={usage.seats} max={FREE_STAFF_SEATS} />
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>

      <DangerZone instituteName={instituteName} />
    </div>
  );
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const near = pct >= 90;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted-strong">{label}</span>
        <span
          className={`text-[12.5px] tabular-nums ${near ? "text-amber-300" : "text-muted"}`}
        >
          {value} / {max}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full track">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DangerZone({ instituteName }: { instituteName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deactivateInstitute, initial);

  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-6">
      <h3 className="text-[15px] font-medium text-red-300">Danger zone</h3>
      <p className="mt-1 text-[13px] text-muted">
        Deactivating pauses portal access and takes your form offline. Your data
        is kept — contact support to reactivate or to permanently delete your
        account.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg border border-red-500/30 px-3.5 py-2 text-[13px] font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Deactivate institute
        </button>
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[13px] text-muted-strong">
              Type <span className="font-medium text-foreground">{instituteName}</span> to confirm
            </span>
            <input
              name="confirm_name"
              required
              autoComplete="off"
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
          <Feedback state={state} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-500/90 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Deactivating…" : "Deactivate"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="surface-2 rounded-lg px-4 py-2 text-[13px] font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ---------- small shared bits ---------- */

function Text({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-muted-strong">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
      />
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </label>
  );
}

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.ok) {
    return (
      <div className="mt-4 flex items-center gap-2 text-[13px] text-emerald-400">
        <Check className="h-4 w-4" strokeWidth={2} />
        Saved
      </div>
    );
  }
  return null;
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
