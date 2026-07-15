import Link from "next/link";
import { Logo } from "@/components/landing/Nav";
import Backdrop from "@/components/landing/Backdrop";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Backdrop />

      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">
          Ordiso
        </span>
      </Link>

      <div className="card-sheen w-full max-w-sm rounded-2xl p-7">
        <h1 className="text-xl font-semibold tracking-[-0.01em]">{title}</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">{subtitle}</p>

        <div className="mt-6">{children}</div>
      </div>

      <p className="mt-6 text-[13px] text-muted">{footer}</p>
    </div>
  );
}
