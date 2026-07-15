import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext, FREE_STAFF_SEATS } from "@/lib/portal";
import InviteForm from "./InviteForm";
import { RoleSelect, RemoveButton, ResendButton } from "./StaffRowActions";

const ROLE_HELP: Record<string, string> = {
  Admin: "Full access, including settings and billing",
  Counselor: "Manage applicants and record payments",
  Viewer: "Read-only oversight",
};

export default async function StaffPage() {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, name, email, role, status, invited_at, joined_at")
    .neq("status", "Removed")
    .order("invited_at", { ascending: true });

  const list = staff ?? [];
  const active = list.filter((s) => s.status === "Active");
  const invited = list.filter((s) => s.status === "Invited");

  const isFree = ctx.institute.plan === "Free";
  const used = active.length + invited.length;
  const atCap = isFree && used >= FREE_STAFF_SEATS;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
            Staff
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
            Your team
          </h1>
          <p className="mt-1.5 max-w-lg text-[13.5px] text-muted">
            Invite staff and control what they can do. Permissions are enforced
            in the database, not just the interface.
          </p>
        </div>
        {isFree && (
          <div className="surface rounded-lg px-3 py-2 text-[13px] tabular-nums">
            <span
              className={atCap ? "text-amber-300" : "text-muted-strong"}
            >
              {used} / {FREE_STAFF_SEATS}
            </span>
            <span className="text-muted"> seats used</span>
          </div>
        )}
      </div>

      {/* Active team */}
      <div className="surface mt-6 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-border text-[12px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {active.map((s) => {
              const isMe = s.id === ctx.staffId;
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {s.name}
                      {isMe && (
                        <span className="ml-2 text-[11.5px] text-muted">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-muted">{s.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect staffId={s.id} role={s.role} disabled={isMe} />
                    <div className="mt-1 text-[11.5px] text-muted">
                      {ROLE_HELP[s.role]}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-strong">
                    {s.joined_at
                      ? new Date(s.joined_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isMe && (
                      <RemoveButton
                        staffId={s.id}
                        name={s.name}
                        isInvite={false}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pending invites */}
      {invited.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[14px] font-medium">
            Pending invites
            <span className="ml-2 text-[12px] font-normal text-muted">
              {invited.length} holding {invited.length === 1 ? "a seat" : "seats"}
            </span>
          </h2>
          <div className="surface mt-3 overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <tbody>
                {invited.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-[12px] text-muted">{s.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-neutral">{s.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-amber">Invited</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <ResendButton staffId={s.id} />
                        <RemoveButton
                          staffId={s.id}
                          name={s.name}
                          isInvite
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6">
        <InviteForm atCap={atCap} seatLimit={FREE_STAFF_SEATS} />
      </div>
    </div>
  );
}
