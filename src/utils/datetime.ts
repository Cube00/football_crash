/**
 * Formats an ISO timestamp for display.
 *
 * The SDK hands over `expiresAt` / `accruedAt` / `completedAt` as ISO strings
 * (its own parser already smooths over the server sending epoch millis or a
 * native Date), so everything the UI has to do is present them. Returns an
 * empty string for anything unparseable rather than printing "Invalid Date".
 */
export function formatDateTime(iso: string | undefined, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
