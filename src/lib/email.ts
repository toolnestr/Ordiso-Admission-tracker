import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { planFeatures, type Plan } from "@/lib/plan";

/**
 * Transactional email via Brevo's HTTP API (Cloudflare Workers can't open raw
 * SMTP sockets, so the API is the right transport). The sending domain
 * (toolnestr.com) is already authenticated in Brevo for the password-reset
 * flow. Requires a BREVO_API_KEY secret on the Worker.
 *
 * Automated applicant emails are a paid feature — they only fire for Premium
 * institutes. Everything is best-effort: a failed send is logged, never thrown,
 * so it can't break the status change / submission that triggered it.
 */

const SITE_URL = "https://admission.toolnestr.com";
const FROM_EMAIL = "noreply@toolnestr.com";

export type EmailKind =
  | "received"
  | "shortlisted"
  | "interview"
  | "admitted"
  | "confirmed"
  | "rejected";

/** Map a pipeline status to the email it should trigger (if any). */
export function statusEmailKind(status: string): EmailKind | null {
  switch (status) {
    case "Shortlisted":
      return "shortlisted";
    case "Interview":
      return "interview";
    case "Admitted":
      return "admitted";
    case "Confirmed":
    case "Confirmed-Partial":
      return "confirmed";
    case "Rejected":
      return "rejected";
    default:
      return null;
  }
}

function displayName(form_data: Record<string, unknown> | null, fallback: string) {
  if (form_data) {
    for (const [k, v] of Object.entries(form_data)) {
      if (/name/i.test(k) && typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return fallback;
}

async function send(opts: {
  to: string;
  toName: string;
  senderName: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.error("BREVO_API_KEY not set — skipping email");
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": key,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: opts.senderName, email: FROM_EMAIL },
        to: [{ email: opts.to, name: opts.toName }],
        subject: opts.subject,
        htmlContent: opts.html,
      }),
    });
    if (!res.ok) {
      console.error("Brevo send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Brevo send error", e);
    return false;
  }
}

function layout(opts: {
  instituteName: string;
  heading: string;
  intro: string;
  ctaText?: string;
  ctaUrl?: string;
  note?: string;
}) {
  const { instituteName, heading, intro, ctaText, ctaUrl, note } = opts;
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e5eb;">
      <tr><td style="padding:32px 32px 0 32px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#7c74ff;letter-spacing:0.02em;text-transform:uppercase;">${instituteName}</p>
      </td></tr>
      <tr><td style="padding:16px 32px 0 32px;">
        <h1 style="margin:0;font-size:20px;font-weight:600;color:#16161a;letter-spacing:-0.01em;">${heading}</h1>
        <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#4a4a55;">${intro}</p>
      </td></tr>
      ${
        ctaText && ctaUrl
          ? `<tr><td style="padding:24px 32px 0 32px;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="background-color:#7c74ff;border-radius:8px;">
                  <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">${ctaText}</a>
                </td>
              </tr></table>
            </td></tr>`
          : ""
      }
      ${
        note
          ? `<tr><td style="padding:20px 32px 0 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6b78;">${note}</p>
            </td></tr>`
          : ""
      }
      <tr><td style="padding:28px 32px 32px 32px;">
        <div style="border-top:1px solid #e5e5eb;padding-top:16px;">
          <p style="margin:0;font-size:12px;color:#9a9aa6;">Sent by ${instituteName} · powered by Ordiso</p>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function content(kind: EmailKind, ctx: {
  name: string;
  institute: string;
  appId: string;
}) {
  const track = `${SITE_URL}/status?id=${encodeURIComponent(ctx.appId)}`;
  switch (kind) {
    case "received":
      return {
        subject: `Application received — ${ctx.institute}`,
        html: layout({
          instituteName: ctx.institute,
          heading: "We've received your application",
          intro: `Hi ${ctx.name}, thanks for applying to ${ctx.institute}. Your Application ID is <strong>${ctx.appId}</strong> — keep it safe. You can check your status any time.`,
          ctaText: "Track application",
          ctaUrl: track,
        }),
      };
    case "shortlisted":
      return {
        subject: `You've been shortlisted — ${ctx.institute}`,
        html: layout({
          instituteName: ctx.institute,
          heading: "You've been shortlisted",
          intro: `Good news, ${ctx.name} — your application to ${ctx.institute} has been shortlisted. We'll be in touch with next steps.`,
          ctaText: "View status",
          ctaUrl: track,
        }),
      };
    case "interview":
      return {
        subject: `Interview stage — ${ctx.institute}`,
        html: layout({
          instituteName: ctx.institute,
          heading: "You've moved to the interview stage",
          intro: `Hi ${ctx.name}, your application to ${ctx.institute} has advanced to the interview stage. The team will share details with you shortly.`,
          ctaText: "View status",
          ctaUrl: track,
        }),
      };
    case "admitted":
      return {
        subject: `You've been admitted — ${ctx.institute}`,
        html: layout({
          instituteName: ctx.institute,
          heading: "Congratulations — you've been admitted!",
          intro: `${ctx.name}, we're delighted to offer you admission to ${ctx.institute}. Check your status page for any remaining steps to confirm your seat.`,
          ctaText: "View next steps",
          ctaUrl: track,
        }),
      };
    case "confirmed":
      return {
        subject: `Admission confirmed — ${ctx.institute}`,
        html: layout({
          instituteName: ctx.institute,
          heading: "Your admission is confirmed",
          intro: `Welcome aboard, ${ctx.name}! Your admission to ${ctx.institute} is now confirmed. We look forward to seeing you.`,
          ctaText: "View details",
          ctaUrl: track,
        }),
      };
    case "rejected":
      return {
        subject: `Update on your application — ${ctx.institute}`,
        html: layout({
          instituteName: ctx.institute,
          heading: "An update on your application",
          intro: `Dear ${ctx.name}, thank you for your interest in ${ctx.institute}. After careful review we're unable to offer admission at this time. We wish you the very best.`,
          note: "This decision relates only to the current admission cycle.",
        }),
      };
  }
}

/**
 * Look up an applicant (by internal id or public application_id), and if their
 * institute is on a paid plan, send the given email. Best-effort.
 */
export async function sendApplicantEmail(
  kind: EmailKind,
  ref: { applicantId?: string; applicationId?: string },
): Promise<void> {
  const svc = createServiceClient();
  let q = svc
    .from("applicants")
    .select(
      "email, application_id, form_data, institutes(display_name, plan, plan_expires_at)",
    )
    .limit(1);
  q = ref.applicantId
    ? q.eq("id", ref.applicantId)
    : q.eq("application_id", ref.applicationId ?? "");

  const { data, error } = await q.maybeSingle();
  if (error || !data || !data.email) return;

  const inst = Array.isArray(data.institutes)
    ? data.institutes[0]
    : (data.institutes as {
        display_name: string;
        plan: Plan;
        plan_expires_at: string | null;
      } | null);
  // Automated emails require an active email-capable plan (Pro/Enterprise).
  if (!inst || !planFeatures(inst.plan, inst.plan_expires_at).emails) return;

  const name = displayName(
    data.form_data as Record<string, unknown> | null,
    "there",
  );
  const { subject, html } = content(kind, {
    name,
    institute: inst.display_name,
    appId: data.application_id as string,
  });

  await send({
    to: data.email as string,
    toName: name,
    senderName: inst.display_name,
    subject,
    html,
  });
}
