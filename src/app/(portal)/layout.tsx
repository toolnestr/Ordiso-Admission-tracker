import { cookies } from "next/headers";
import Sidebar from "@/components/portal/Sidebar";
import Topbar from "@/components/portal/Topbar";
import { getPortalContext } from "@/lib/portal";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalContext();
  const cookieStore = await cookies();
  const theme = cookieStore.get("ordiso-theme")?.value === "light"
    ? "light"
    : "dark";

  return (
    <div
      className="portal min-h-dvh bg-background text-foreground"
      data-theme={theme}
    >
      <Sidebar role={ctx.role} />
      <div className="md:pl-60">
        <Topbar ctx={ctx} />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
