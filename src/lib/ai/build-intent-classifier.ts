export type BuildIntent =
  | "build_app"
  | "edit_app"
  | "discuss_question"
  | "support_answer"
  | "debug_help"
  | "publish_help"
  | "clarification_needed";

/** @deprecated — use BuildIntent */
export type LegacyBuildIntent = BuildIntent;

export type BuildIntentResult = {
  intent: BuildIntent;
  confidence: number;
  reason: string;
};

const GREETING = /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay)[\s!.?]*$/i;
const TEST_ONLY = /^(test|testing|asdf|foo|bar|demo)[\s!.?]*$/i;
const PRODUCT =
  /\b(credits?|pricing|plan|subscription|token|billing|how much|what model|which model|how many credits|dreamos86|dreamos)\b/i;
const DEBUG =
  /\b(bug|broken|not working|error|slow|crash|blank screen|preview stuck|why is my app|debug|fix preview|compile)\b/i;
const PUBLISH =
  /\b(publish|deploy|subdomain|custom domain|go live|production url|vercel)\b/i;
const SUPPORT =
  /\b(support|contact|refund|cancel subscription|login issue|account)\b/i;
const BUILD_VERBS =
  /\b(build|create|make|generate|design|develop|scaffold|implement|ship|launch|add a|add an)\b/i;
const APP_NOUNS =
  /\b(app|application|website|site|dashboard|portal|platform|tool|saas|store|marketplace|calculator|tracker|crm|blog|chatbot|todo)\b/i;
const EDIT_VERBS =
  /\b(edit|update|change|fix the|modify|refactor|improve|tweak|adjust|make it darker|make it lighter|change layout|change the button)\b/i;
const QUESTION_START =
  /^(how|what|why|when|where|who|can i|should i|is there|do i)\b/i;

export function classifyBuildIntent(prompt: string): BuildIntentResult {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return { intent: "clarification_needed", confidence: 0.95, reason: "empty_prompt" };
  }

  if (TEST_ONLY.test(text) || GREETING.test(text)) {
    return { intent: "discuss_question", confidence: 0.94, reason: "greeting_or_test" };
  }

  if (PUBLISH.test(lower) && !BUILD_VERBS.test(lower)) {
    return { intent: "publish_help", confidence: 0.86, reason: "publish_question" };
  }

  if (DEBUG.test(lower) && !BUILD_VERBS.test(lower)) {
    return { intent: "debug_help", confidence: 0.84, reason: "debug_or_quality_question" };
  }

  if (SUPPORT.test(lower)) {
    return { intent: "support_answer", confidence: 0.82, reason: "support_signals" };
  }

  if (PRODUCT.test(lower) && !BUILD_VERBS.test(lower)) {
    return { intent: "discuss_question", confidence: 0.9, reason: "product_or_credits_question" };
  }

  if (QUESTION_START.test(lower) && !BUILD_VERBS.test(lower) && !APP_NOUNS.test(lower)) {
    return { intent: "discuss_question", confidence: 0.8, reason: "general_question" };
  }

  if (text.length < 14 && !BUILD_VERBS.test(lower) && !APP_NOUNS.test(lower)) {
    return { intent: "discuss_question", confidence: 0.78, reason: "too_short_for_build" };
  }

  if (
    EDIT_VERBS.test(lower) &&
    (APP_NOUNS.test(lower) || /\b(this|my|the)\s+(app|project|screen|page|button|layout)\b/i.test(lower))
  ) {
    return { intent: "edit_app", confidence: 0.85, reason: "edit_request" };
  }

  if (BUILD_VERBS.test(lower) || (APP_NOUNS.test(lower) && text.split(/\s+/).length >= 4)) {
    const confidence =
      BUILD_VERBS.test(lower) && APP_NOUNS.test(lower)
        ? 0.92
        : BUILD_VERBS.test(lower)
          ? 0.8
          : 0.68;
    return { intent: "build_app", confidence, reason: "app_creation_signals" };
  }

  if (text.split(/\s+/).length >= 12 && APP_NOUNS.test(lower)) {
    return { intent: "build_app", confidence: 0.55, reason: "detailed_app_description" };
  }

  return { intent: "discuss_question", confidence: 0.72, reason: "no_clear_app_request" };
}

/** True when build mode should create jobs / save generated app files. */
export function shouldStartBuildPipeline(
  mode: string,
  intent: BuildIntentResult | null,
): boolean {
  if (mode !== "build") return false;
  if (!intent) return false;
  return intent.intent === "build_app" || intent.intent === "edit_app";
}
