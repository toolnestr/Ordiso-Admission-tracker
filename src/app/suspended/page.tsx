import { PauseCircle } from "lucide-react";
import { signOut } from "@/app/(portal)/actions";
import { Logo } from "@/components/landing/Nav";

/**
 * Where getPortalContext sends staff whose institute is Suspended or
 * Deactivated. Deliberately says nothing about *why* — that's a conversation
 * for support, not a status page.
 */
export default function SuspendedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mb-8 flex items-center gap-2.5">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Ordiso</span>
      </div>

      <div className="card-sheen w-full max-w-md rounded-2xl p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 text-amber-300">
          <PauseCircle className="h-6 w-6" strokeWidth={1.7} />
        </span>
        <h1 className="mt-4 text-lg font-semibold">This account is paused</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Your institute&apos;s portal and application form are temporarily
          offline. Your data is safe and nothing has been deleted. Get in touch
          and we&apos;ll sort it out.
        </p>

        <a
          href="mailto:hello@ordiso.app"
          className="mt-6 inline-block rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Contact support
        </a>

        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="text-[13px] text-muted transition-colors hover:text-foreground"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
