import { Logo } from "./Nav";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[14px] font-semibold">Ordiso</span>
        </div>
        <p className="text-[13px] text-muted">
          Free admission management for institutes.
        </p>
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Ordiso. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
