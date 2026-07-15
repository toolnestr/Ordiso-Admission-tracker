import { createServiceClient } from "@/lib/supabase/server";
import AuthShell from "@/components/auth/AuthShell";
import AcceptInviteForm from "./AcceptInviteForm";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: invite } = await service
    .from("invite_tokens")
    .select("staff_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  const invalid =
    !invite || invite.used_at || new Date(invite.expires_at) < new Date();

  if (invalid) {
    return (
      <AuthShell
        title="Invite not valid"
        subtitle="This link has expired, was already used, or isn't recognised."
        footer={
          <>
            Already have an account?{" "}
            <a href="/login" className="font-medium text-foreground">
              Log in
            </a>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Ask your institute Admin to send you a fresh invite link.
        </p>
      </AuthShell>
    );
  }

  const { data: staff } = await service
    .from("staff")
    .select("name, email, role, institutes(display_name)")
    .eq("id", invite.staff_id)
    .single();

  const institute = Array.isArray(staff?.institutes)
    ? staff?.institutes[0]
    : staff?.institutes;

  return (
    <AuthShell
      title={`Join ${institute?.display_name ?? "your institute"}`}
      subtitle={`You've been invited as ${staff?.role}. Set a password to get started.`}
      footer={
        <>
          Already have an account?{" "}
          <a href="/login" className="font-medium text-foreground">
            Log in
          </a>
        </>
      }
    >
      <AcceptInviteForm
        token={token}
        name={staff?.name ?? ""}
        email={staff?.email ?? ""}
      />
    </AuthShell>
  );
}
