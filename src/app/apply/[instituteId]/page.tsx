import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/landing/Nav";
import ApplyForm, { type PublicForm } from "./ApplyForm";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ instituteId: string }>;
}) {
  const { instituteId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_form", {
    p_institute_id: instituteId,
  });

  const form = data as PublicForm | null;

  if (error || !form || "error" in (form as object)) {
    return (
      <Shell>
        <div className="card-sheen rounded-2xl p-8 text-center">
          <h1 className="text-lg font-semibold">Form not found</h1>
          <p className="mt-2 text-[13.5px] text-muted">
            This application link isn&apos;t valid. Please check with the
            institute for the correct link.
          </p>
        </div>
      </Shell>
    );
  }

  const sessionFull = form.session?.is_full;
  const noSession = !form.session;

  return (
    <Shell instituteName={form.institute.display_name}>
      {noSession ? (
        <Notice
          title="Applications are closed"
          body="This institute isn't accepting applications right now. Please check back later."
        />
      ) : sessionFull ? (
        <Notice
          title="This admission cycle is full"
          body="The institute has reached its application limit for this session. Please check back for the next cycle."
        />
      ) : (
        <ApplyForm form={form} instituteId={instituteId} />
      )}
    </Shell>
  );
}

function Shell({
  children,
  instituteName,
}: {
  children: React.ReactNode;
  instituteName?: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <Logo />
        <span className="text-[14px] font-semibold tracking-tight">
          {instituteName ?? "Ordiso"}
        </span>
      </div>
      {children}
      <p className="mt-8 text-center text-[11.5px] text-muted">
        Powered by Ordiso
      </p>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-sheen rounded-2xl p-8 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-[13.5px] text-muted">{body}</p>
    </div>
  );
}
