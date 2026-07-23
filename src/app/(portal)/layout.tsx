import Sidebar from "@/components/portal/Sidebar";
import Topbar from "@/components/portal/Topbar";
import Announcements from "@/components/portal/Announcements";
import { getPortalContext } from "@/lib/portal";
import { planLabel } from "@/lib/plan";

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalContext();

  return (
    <div className="min-h-dvh">
      <Sidebar role={ctx.role} />
      <div className="md:pl-60">
        <Topbar ctx={ctx} />

        {ctx.planState === "grace" && (
          <div className="border-b border-amber-500/25 bg-amber-500/10 px-6 py-2.5 text-center text-[13px] text-amber-200">
            Your {planLabel(ctx.institute.plan)} plan expired
            {ctx.institute.grace_until
              ? ` — grace period until ${fmt(ctx.institute.grace_until)}`
              : ""}
            . Please renew to keep premium features.
          </div>
        )}
        {ctx.planState === "expired" && (
          <div className="border-b border-red-500/25 bg-red-500/10 px-6 py-2.5 text-center text-[13px] text-red-200">
            Your plan has expired and reverted to Free limits. Contact us to
            renew.
          </div>
        )}

        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
      <Announcements />
    </div>
  );
}
