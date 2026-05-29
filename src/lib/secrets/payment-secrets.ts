import { sealSecret, unsealSecret } from "@/lib/secrets/seal";

export function encryptSecretValue(plaintext: string): string {
  return sealSecret(plaintext);
}

export function decryptSecretValue(sealed: string): string {
  return unsealSecret(sealed);
}

/** Show last 4 chars only for admin UI. */
export function redactSecretValue(value: string | null | undefined): string | null {
  if (!value || value.length < 4) return value ? "••••" : null;
  return `••••${value.slice(-4)}`;
}

export function redactConfigSecrets(
  config: Record<string, unknown>,
  secretKeys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...config };
  for (const key of secretKeys) {
    if (typeof out[key] === "string") {
      out[key] = redactSecretValue(out[key] as string);
    }
  }
  return out;
}
