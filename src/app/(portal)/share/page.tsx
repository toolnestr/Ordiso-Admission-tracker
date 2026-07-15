import { headers } from "next/headers";
import { getPortalContext } from "@/lib/portal";
import ShareTools from "./ShareTools";

export default async function SharePage() {
  const ctx = await getPortalContext();

  // Build an absolute URL from the request host so the link/QR are shareable.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/apply/${ctx.institute.id}`;

  return (
    <div>
      <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
        Share & QR
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
        Share your application form
      </h1>
      <p className="mt-1.5 max-w-lg text-[13.5px] text-muted">
        Share this link or QR code anywhere — social media, WhatsApp, notice
        boards, or your prospectus. Students apply with no account needed.
      </p>

      <div className="mt-6">
        <ShareTools url={url} instituteName={ctx.institute.display_name} />
      </div>

      {ctx.institute.plan === "Free" && (
        <p className="mt-6 rounded-lg border border-accent-soft bg-accent-soft px-4 py-3 text-[13px] text-accent">
          Want your own domain instead of an Ordiso link? Upgrade to Premium.
        </p>
      )}
    </div>
  );
}
