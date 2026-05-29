/** Entitlement checks for mobile IAP — not web checkout. */
export async function checkRevenueCatEntitlement(_input: {
  projectId: string;
  appUserId: string;
  entitlementId: string;
}): Promise<{ active: boolean }> {
  return { active: false };
}
