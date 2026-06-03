import { sendResendEmail } from "@/lib/email/send-resend-email";

export async function sendDestructiveActionEmail(input: {
  to: string;
  otp: string;
  actionSummary: string;
  expiresMinutes: number;
}) {
  const subject = "Confirm destructive action on Vodex";
  const text = [
    "Vodex security confirmation",
    "",
    `Action: ${input.actionSummary}`,
    "",
    `Your confirmation code: ${input.otp}`,
    "",
    `This code expires in ${input.expiresMinutes} minutes.`,
    "If you did not request this, secure your account and contact support immediately.",
  ].join("\n");

  return sendResendEmail({
    to: input.to,
    subject,
    text,
    devConsoleFallback: true,
    devLabel: "destructive-action",
  });
}
