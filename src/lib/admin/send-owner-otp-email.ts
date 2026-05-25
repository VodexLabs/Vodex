import { DREAMOS_OWNER_EMAIL } from "@/lib/admin-owner";
import { sendResendEmail } from "@/lib/email/send-resend-email";

export type OwnerOtpDeliveryChannel = "resend" | "dev_console" | "none";

export type OwnerOtpEmailResult = {
  deliveredToInbox: boolean;
  channel: OwnerOtpDeliveryChannel;
  message: string;
  error?: string;
};

export async function sendOwnerOtpEmail(input: {
  otp: string;
  actionSummary: string;
  expiresMinutes: number;
}): Promise<OwnerOtpEmailResult> {
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

  const result = await sendResendEmail({
    to,
    subject,
    text,
    devConsoleFallback: true,
    devLabel: "admin-otp",
  });

  return {
    deliveredToInbox: result.deliveredToInbox,
    channel: result.channel,
    message: result.message,
    error: result.error,
  };
}
