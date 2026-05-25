/** Parse admin/UI credit input — max one decimal place. */
export function parseCreditAmountInput(raw: string, options?: { min?: number; allowZero?: boolean }): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^-?\d+(\.\d)?$/.test(trimmed)) return null;

  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;

  const min = options?.min ?? 0.1;
  if (options?.allowZero ? n < 0 : n < min) return null;

  return Math.round(n * 10) / 10;
}

export function roundCreditOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}
