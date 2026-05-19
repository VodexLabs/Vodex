/**
 * DreamOS86 platform owner — admin APIs and /admin route must enforce this server-side.
 */
export const DREAMOS_OWNER_EMAIL = "dreamos86app@gmail.com";

export function isDreamosOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === DREAMOS_OWNER_EMAIL;
}
