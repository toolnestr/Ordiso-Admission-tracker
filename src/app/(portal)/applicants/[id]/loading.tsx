// The detail page runs many Supabase queries (applicant + siblings + fees +
// notes + comms + activity + follow-ups + signed doc URLs), so on a slow
// connection it can take a beat. This skeleton mirrors the detail layout
// (back link → name/header → status control → tab bar) so a click into an
// applicant feels instant instead of stuck.
export default function ApplicantDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-28 rounded bg-surface-2" />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="h-7 w-48 rounded bg-surface-2" />
          <div className="mt-2 h-3 w-64 rounded bg-surface-2/70" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-lg bg-surface-2" />
          <div className="h-9 w-9 rounded-lg bg-surface-2" />
        </div>
      </div>

      <div className="mt-5 h-16 rounded-xl border border-border" />

      <div className="mt-6 flex gap-4 border-b border-border pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-16 rounded bg-surface-2" />
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <div className="h-24 rounded-xl border border-border" />
        <div className="h-24 rounded-xl border border-border" />
      </div>
    </div>
  );
}
