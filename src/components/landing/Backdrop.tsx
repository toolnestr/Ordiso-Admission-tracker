export default function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* faint grid */}
      <div className="bg-grid absolute inset-0 opacity-60" />
      {/* single restrained accent glow at top */}
      <div className="accent-glow absolute inset-x-0 top-0 h-[520px]" />
      {/* fade grid into background toward bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, transparent 40%, var(--background) 100%)",
        }}
      />
    </div>
  );
}
