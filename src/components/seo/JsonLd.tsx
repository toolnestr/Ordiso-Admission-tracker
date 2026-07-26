/**
 * Renders a JSON-LD structured-data block. Server component — the script is
 * emitted in the initial HTML so crawlers and AI assistants read it without
 * running JS. Pass any Schema.org object (or array) as `data`.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Schema is authored by us (no user input), so this is safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
