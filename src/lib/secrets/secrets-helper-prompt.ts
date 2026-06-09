/** Prompt inserted (not auto-sent) when user clicks Ask AI for secrets setup. */
export const SECRETS_HELPER_PROMPT =
  "Help me connect the required secrets for this imported app. Explain briefly what each missing key is for, where to get it, and open the secure setup form.";

export function isSecretsHelperPrompt(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const t = text.trim().toLowerCase();
  return (
    t.includes("required secrets") &&
    t.includes("imported app") &&
    (t.includes("secure setup") || t.includes("connect"))
  );
}
