/** Compact JSON-only prompts for staged build pipeline. */

export const JSON_ONLY_RULE =
  "Return ONLY valid JSON. No markdown, no code fences, no prose outside JSON.";

export function buildPlanPrompt(userPrompt: string, scopeNote: string): string {
  return [
    JSON_ONLY_RULE,
    `User request: ${userPrompt.slice(0, 2000)}`,
    scopeNote,
    `Return: { "complexity": 1-10, "summary": "", "steps": ["..."], "pages": ["..."], "entities": ["..."], "core_v1_only": boolean, "queued_later": ["..."] }`,
  ].join("\n");
}

export function appIdentityPrompt(userPrompt: string, planJson: string): string {
  return [
    JSON_ONLY_RULE,
    `Plan: ${planJson.slice(0, 1500)}`,
    `User: ${userPrompt.slice(0, 800)}`,
    `Return: { "app": { "name": "", "slug": "", "description": "", "category": "", "theme": { "primary": "", "accent": "", "background": "", "style": "premium" } } }`,
    "App name must be specific (not New App). No markdown in name.",
  ].join("\n");
}

export function iconSvgPrompt(appName: string, category: string): string {
  return [
    JSON_ONLY_RULE,
    `App: ${appName}, category: ${category}`,
    `Return: { "icon_svg": "<svg xmlns=... viewBox=0 0 64 64>...</svg>" }`,
    "Simple flat icon, single color gradient, no external images.",
  ].join("\n");
}

export function schemaPrompt(planJson: string): string {
  return [
    JSON_ONLY_RULE,
    `Plan: ${planJson.slice(0, 2000)}`,
    `Return: { "entities": [{ "name": "", "fields": [{ "name": "", "type": "" }] }], "rls_notes": "" }`,
  ].join("\n");
}

export function uiPlanPrompt(planJson: string, schemaJson: string): string {
  return [
    JSON_ONLY_RULE,
    `Plan: ${planJson.slice(0, 1200)}`,
    `Schema: ${schemaJson.slice(0, 1200)}`,
    `Return: { "navigation": "", "screens": [{ "id": "", "title": "", "components": [] }], "design_tokens": {} }`,
  ].join("\n");
}

export const FILE_PAYLOAD_RULE = [
  JSON_ONLY_RULE,
  `Return exactly:`,
  `{ "files": [{ "path": "preview/index.html", "language": "html", "content": "..." }],`,
  `  "events": [{ "type": "wrote", "path": "", "summary": "" }],`,
  `  "metadata": { "app_name": "" } }`,
  "No markdown fences. No explanations. preview/index.html must be full responsive UI with embedded CSS.",
  "Include 4-8 screens for normal apps. Premium SaaS styling.",
].join("\n");

export function frontendPrompt(
  userPrompt: string,
  planJson: string,
  uiJson: string,
  maxFiles: number,
): string {
  return [
    FILE_PAYLOAD_RULE,
    `Max ${maxFiles} files. Prioritize preview/index.html and key src/ files.`,
    `User: ${userPrompt.slice(0, 1000)}`,
    `Plan: ${planJson.slice(0, 1000)}`,
    `UI: ${uiJson.slice(0, 1000)}`,
  ].join("\n");
}

export function backendPrompt(planJson: string, schemaJson: string): string {
  return [
    FILE_PAYLOAD_RULE,
    "Generate API routes, server actions, or lib modules only if needed.",
    `Plan: ${planJson.slice(0, 1000)}`,
    `Schema: ${schemaJson.slice(0, 1000)}`,
  ].join("\n");
}
