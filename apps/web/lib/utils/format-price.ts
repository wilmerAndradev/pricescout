/**
 * Format a number as Chilean Peso (CLP).
 * Uses dot as thousands separator — no decimals.
 * FDS rule: prices always in JetBrains Mono, format $1.234.567
 *
 * @example formatPrice(1234567) → "$1.234.567"
 * @example formatPrice(0)       → "$0"
 * @example formatPrice(null)    → "—"
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toLocaleString("es-CL")}`;
}
