/** Join conditional class names. Small enough not to justify a dependency. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Format an ISO timestamp as "14 Aug 2026".
 *
 * `timeZone: "UTC"` and a fixed locale are load-bearing, not fussiness. This
 * runs on the server during SSR and again in the browser during hydration; if
 * the two disagree — because the container is UTC and the user is UTC+6, or
 * because their locale renders 08/14 vs 14/08 — React throws a hydration
 * mismatch and replaces the markup. Pinning both makes the two renders
 * byte-identical.
 */
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

/** "Ada Lovelace" -> "AL", for the avatar circle. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
