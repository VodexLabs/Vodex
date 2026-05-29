export type RevenueCatSecrets = {
  public_sdk_key?: string;
  secret_api_key?: string;
  entitlement_id?: string;
  offering_id?: string;
};

export async function verifyRevenueCatConfig(
  secrets: RevenueCatSecrets,
): Promise<{ ok: boolean; message: string }> {
  const pub = secrets.public_sdk_key?.trim();
  const sec = secrets.secret_api_key?.trim();
  if (!pub && !sec) {
    return { ok: false, message: "RevenueCat public SDK key or secret API key required" };
  }
  if (sec) {
    try {
      const res = await fetch("https://api.revenuecat.com/v1/subscribers/app_user_id_test", {
        headers: {
          Authorization: `Bearer ${sec}`,
          "Content-Type": "application/json",
        },
      });
      if (res.status === 401) {
        return { ok: false, message: "RevenueCat secret key rejected" };
      }
      return { ok: true, message: "RevenueCat API key accepted" };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Verify failed" };
    }
  }
  if (pub && (pub.startsWith("goog_") || pub.startsWith("appl_"))) {
    return { ok: true, message: "RevenueCat public SDK key format looks valid" };
  }
  return { ok: false, message: "RevenueCat public key should start with goog_ or appl_" };
}
