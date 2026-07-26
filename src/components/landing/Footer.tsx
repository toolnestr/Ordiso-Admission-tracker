import { Logo } from "./Nav";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[14px] font-semibold">Ordiso</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted">
          <a href="/status" className="transition-colors hover:text-foreground">
            Track application
          </a>
          <a href="/contact" className="transition-colors hover:text-foreground">
            Contact
          </a>
          <a href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </a>
          <a href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </a>
          <a href="/login" className="transition-colors hover:text-foreground">
            Institute login
          </a>
        </div>
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Ordiso. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
