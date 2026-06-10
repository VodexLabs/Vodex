import { sendResendEmail } from "@/lib/email/send-resend-email";

export async function sendGroupDeleteVerificationEmail(input: {
  to: string;
  groupName: string;
  confirmUrl: string;
  otp: string;
  expiresMinutes: number;
}) {
  const subject = `Confirm deletion of group "${input.groupName}"`;
  const text = [
    "Vodex group deletion confirmation",
    "",
    `You requested to permanently delete the group "${input.groupName}".`,
    "",
    `Confirmation code: ${input.otp}`,
    `Or open this link: ${input.confirmUrl}`,
    "",
    `This expires in ${input.expiresMinutes} minutes.`,
    "If you did not request this, ignore this email.",
  ].join("\n");

  return sendResendEmail({
    to: input.to,
    subject,
    text,
    devConsoleFallback: true,
    devLabel: "group-delete",
  });
}
