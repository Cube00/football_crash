/**
 * Formats a timestamp for display.
 *
 * The SDK hands over `expiresAt` / `accruedAt` / `completedAt` as ISO strings
 * (its own parser already smooths over the server sending epoch millis or a
 * native Date), and round times — `startTimeMs`, `crash-history-item`'s
 * `timestamp` — as epoch milliseconds. Both are accepted here so a caller never
 * has to convert one into the other first. Returns an empty string for anything
 * unparseable rather than printing "Invalid Date".
 */
export function formatDateTime(
  value: string | number | undefined,
  locale: string,
): string {
  if (value === undefined || value === "") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
