import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import SettingsSections from "./SettingsSections";

export default async function SettingsPage() {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: institute }, { data: programs }, { data: templates }, { count: seats }] =
    await Promise.all([
      supabase
        .from("institutes")
        .select(
          "display_name, contact_email, contact_phone, address, working_hours, currency, timezone, plan, status_page_messages",
        )
        .eq("id", ctx.institute.id)
        .single(),
      supabase
        .from("programs")
        .select("id, name")
        .eq("institute_id", ctx.institute.id)
        .order("name"),
      supabase
        .from("fee_structure_templates")
        .select("id, name, default_amount, programs(name)")
        .eq("institute_id", ctx.institute.id),
      supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .in("status", ["Active", "Invited"]),
    ]);

  if (!institute) redirect("/dashboard");

  return (
    <div>
      <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
        Settings
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
        Institute settings
      </h1>
      <p className="mt-1.5 max-w-lg text-[13.5px] text-muted">
        Everything here applies only to your institute.
      </p>

      <div className="mt-6">
        <SettingsSections
          institute={{
            ...institute,
            status_page_messages:
              (institute.status_page_messages as Record<string, string>) ?? {},
          }}
          programs={programs ?? []}
          feeTemplates={
            (templates ?? []).map((t) => ({
              ...t,
              programs: Array.isArray(t.programs) ? t.programs[0] : t.programs,
            })) as never[]
          }
          usage={{
            applicants: ctx.session?.total_applications_received ?? 0,
            seats: seats ?? 0,
          }}
        />
      </div>
    </div>
  );
}
