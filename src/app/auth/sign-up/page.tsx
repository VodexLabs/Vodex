import { redirect } from "next/navigation";

/** Canonical sign-up URL is /auth/signup (no hyphen). Redirect for convenience. */
export default function SignUpRedirect() {
  redirect("/auth/signup");
}
