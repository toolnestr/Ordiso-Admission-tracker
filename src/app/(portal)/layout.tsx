import Sidebar from "@/components/portal/Sidebar";
import Topbar from "@/components/portal/Topbar";
import { getPortalContext } from "@/lib/portal";

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
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
