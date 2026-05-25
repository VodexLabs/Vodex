const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|password|token|private[_-]?key|service[_-]?role)\s*[:=]\s*['"][^'"]+['"]/gi,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+ PRIVATE KEY-----/g,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
];

export function sanitizeMobileBuildLog(raw: string): string {
  let out = raw;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  return out.slice(0, 50_000);
}

export const MOBILE_CREDENTIAL_KEY_PREFIX = "mobile_";

export const MOBILE_SECRET_KEYS = {
  android_signing_keystore: "mobile_android_signing_keystore",
  android_upload_key: "mobile_android_upload_key",
  google_play_service_account: "mobile_google_play_service_account",
  firebase_google_services: "mobile_firebase_google_services",
  asc_api_private_key: "mobile_asc_api_private_key",
  apns_key: "mobile_apns_key",
} as const;
