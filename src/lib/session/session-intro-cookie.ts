export const SESSION_INTRO_PENDING_COOKIE = "vodex_session_intro_pending";

export function sessionIntroPendingFromCookieHeader(
  cookieHeader: string | null | undefined,
): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return name === SESSION_INTRO_PENDING_COOKIE && value === "1";
  });
}
