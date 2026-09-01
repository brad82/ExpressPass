export function formatCents(
  cents: number | null | undefined,
  locale = "en-CA",
  currency = "CAD",
): string {
  if (cents === null || cents === undefined) {
    return "";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function centsToDollarInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return "";
  }
  return (cents / 100).toFixed(2);
}

export function dollarInputToCents(value: string): number {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized) {
    return 0;
  }
  return Math.round(Number(normalized) * 100);
}
