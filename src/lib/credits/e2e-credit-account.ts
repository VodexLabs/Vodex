/** Shared E2E test account detection (safe for client + server imports). */

export function isE2eCreditTestAccount(email?: string | null): boolean {
  const e = email?.trim().toLowerCase() ?? "";
  if (e.endsWith("@vodex.test")) return true;
  const configured = process.env.E2E_TEST_EMAIL?.trim().toLowerCase();
  return Boolean(configured && configured === e);
}
