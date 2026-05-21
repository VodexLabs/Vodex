import { DREAMOS_OWNER_EMAIL } from "@/lib/admin-owner";

export async function sendOwnerOtpEmail(input: {
  otp: string;
  actionSummary: string;
  expiresMinutes: number;
}): Promise<{ sent: boolean; channel: "resend" | "dev_console" }> {
  const to = DREAMOS_OWNER_EMAIL;
  const subject = `DreamOS86 admin confirmation — ${input.actionSummary}`;
  const text = [
    `DreamOS86 admin action confirmation`,
    ``,
    `Action: ${input.actionSummary}`,
    `Confirmation code: ${input.otp}`,
    ``,
    `This code expires in ${input.expiresMinutes} minutes.`,
    `If you did not request this, ignore this email.`,
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    const from = process.env.RESEND_FROM_EMAIL?.trim() || "DreamOS86 <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Resend failed (${res.status}): ${errText.slice(0, 200)}`);
    }
    return { sent: true, channel: "resend" };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[admin-otp] Dev mode — email not configured. Code for", to, ":", input.otp);
    return { sent: true, channel: "dev_console" };
  }

  throw new Error("RESEND_API_KEY is required to send admin confirmation emails in production.");
}
