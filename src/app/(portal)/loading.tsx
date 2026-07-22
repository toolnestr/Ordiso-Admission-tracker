// Shown instantly on every portal navigation while the server component fetches
// from Supabase (Seoul region round-trips are slow — see project notes). Without
// this file the App Router renders nothing until the whole page is ready, which
// made clicks feel unresponsive. A skeleton that echoes the general page shape
// (title + stat row + panel) is enough to signal "it's loading."
export default function PortalLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded bg-surface-2" />
      <div className="mt-3 h-7 w-52 rounded bg-surface-2" />
      <div className="mt-2 h-4 w-72 rounded bg-surface-2/70" />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5">
            <div className="h-3 w-20 rounded bg-surface-2" />
            <div className="mt-4 h-7 w-12 rounded bg-surface-2" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl border border-border" />
        <div className="h-64 rounded-2xl border border-border" />
      </div>
    </div>
  );
}
