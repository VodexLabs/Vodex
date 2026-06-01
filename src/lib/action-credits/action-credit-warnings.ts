import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { monthlyActionCreditsForPlan } from "@/lib/action-credits/action-credit-allowances";
import { actionCreditUsageWarning, type ActionCreditUsageWarning } from "@/lib/action-credits/runtime-owner-metering";
import { sendResendEmail } from "@/lib/email/send-resend-email";
import { isEmailConfigured } from "@/lib/email/email-config";

const WARNING_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type ActionCreditWarningState = {
  level: ActionCreditUsageWarning;
  allowance: number;
  balance: number;
  usedPercent: number;
  dashboardMessage: string | null;
};

export function buildActionCreditWarningState(
  balance: number,
  planId: string | null | undefined,
): ActionCreditWarningState {
  const allowance = monthlyActionCreditsForPlan(planId);
  const level = actionCreditUsageWarning(balance, planId);
  const used = Math.max(0, allowance - balance);
  const usedPercent = allowance > 0 ? Math.round((used / allowance) * 100) : 0;

  let dashboardMessage: string | null = null;
  if (level === "warn_80") {
    dashboardMessage = `You've used about ${usedPercent}% of your monthly Action Credits. Runtime AI, email, and media may pause soon.`;
  } else if (level === "warn_90") {
    dashboardMessage = `You've used about ${usedPercent}% of your monthly Action Credits. Consider upgrading or topping up before runtime features pause.`;
  } else if (level === "depleted") {
    dashboardMessage =
      "Action Credits are depleted. Runtime AI, email, and media are paused until your balance resets or you add credits.";
  }

  return { level, allowance, balance, usedPercent, dashboardMessage };
}

async function shouldSendWarningEmail(
  userId: string,
  level: "warn_90" | "depleted",
): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const key = `action_credit_${level}`;
  const since = new Date(Date.now() - WARNING_COOLDOWN_MS).toISOString();
  const { data } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "credit")
    .gte("created_at", since)
    .ilike("title", level === "depleted" ? "%Action Credits depleted%" : "%Action Credits running low%")
    .limit(1);
  return !(data && data.length > 0);
}

/** Platform-owned billing emails — never charged to owner Action Credits. */
export async function maybeNotifyActionCreditWarning(input: {
  userId: string;
  email: string | null;
  planId: string | null | undefined;
  balance: number;
}): Promise<ActionCreditWarningState> {
  const state = buildActionCreditWarningState(input.balance, input.planId);
  const admin = createSupabaseAdmin();

  if (state.dashboardMessage && state.level !== "none") {
    await admin.from("notifications").insert({
      user_id: input.userId,
      type: "credit",
      title:
        state.level === "depleted"
          ? "Action Credits depleted"
          : state.level === "warn_90"
            ? "Action Credits running low"
            : "Action Credits usage high",
      body: state.dashboardMessage,
      action_url: "/settings/billing",
    });
  }

  if (!input.email || !isEmailConfigured()) return state;
  if (state.level !== "warn_90" && state.level !== "depleted") return state;

  const emailLevel = state.level === "depleted" ? "depleted" : "warn_90";
  if (!(await shouldSendWarningEmail(input.userId, emailLevel))) return state;

  const subject =
    emailLevel === "depleted"
      ? "Vodex — Action Credits depleted"
      : "Vodex — Action Credits running low";
  const body =
    emailLevel === "depleted"
      ? `${state.dashboardMessage}\n\nNormal app pages and database features keep working. Add credits or wait for your monthly reset.\n\nManage billing: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://vodex.dev"}/settings/billing`
      : `${state.dashboardMessage}\n\nManage billing: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://vodex.dev"}/settings/billing`;

  await sendResendEmail({
    to: input.email,
    subject,
    text: body,
    devConsoleFallback: true,
    devLabel: "platform_action_credit_warning",
  });

  return state;
}
