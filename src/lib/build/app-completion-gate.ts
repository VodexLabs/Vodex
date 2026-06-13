/**
 * Domain completion gates — production builds must meet prompt-specific minimums.
 */
import {
  countRenderablePages,
  filterRenderableBuildFiles,
  type BuildFile,
} from "@/lib/build/generated-file-utils";
import { rootPageContentOk } from "@/lib/build/root-page-repair";
import { isGeneratedFileStub } from "@/lib/build/generated-file-stub";

export type AppCompletionGateResult = {
  passes: boolean;
  domain: string | null;
  missing: string[];
  userMessage: string;
  shouldContinue: boolean;
};

function pathHas(files: BuildFile[], re: RegExp): boolean {
  return files.some((f) => re.test(f.path.replace(/\\/g, "/")));
}

function contentMentions(files: BuildFile[], re: RegExp): boolean {
  return files.some((f) => re.test(f.content));
}

export function isRecipesAppPrompt(prompt: string): boolean {
  return /recipe|recipes|cookbook|meal plan|ingredient/i.test(prompt);
}

export function evaluateRecipesAppCompletionGate(
  files: BuildFile[],
  prompt: string,
): AppCompletionGateResult {
  if (!isRecipesAppPrompt(prompt)) {
    return {
      passes: true,
      domain: null,
      missing: [],
      userMessage: "",
      shouldContinue: false,
    };
  }

  const renderable = filterRenderableBuildFiles(files);
  const missing: string[] = [];

  if (!rootPageContentOk(renderable)) missing.push("recipe home or dashboard");
  if (countRenderablePages(renderable) < 4) missing.push("recipe list and detail pages");
  if (!pathHas(renderable, /saved|favorite|bookmark/i)) missing.push("saved/favorites");
  if (!pathHas(renderable, /categor|search|filter/i) && !contentMentions(renderable, /categor|search|filter/i)) {
    missing.push("categories, search, or filters");
  }
  if (!pathHas(renderable, /mock-data|recipes\.ts|data\/recipes/i)) missing.push("mock recipe data");
  if (renderable.some((f) => /page\.(tsx|jsx)$/i.test(f.path) && isGeneratedFileStub(f.content, f.path))) {
    missing.push("non-blank recipe screens");
  }

  const passes = missing.length === 0;
  return {
    passes,
    domain: "recipes",
    missing,
    userMessage: passes
      ? ""
      : "Continuing app completion — finishing recipe screens, navigation, and data.",
    shouldContinue: !passes,
  };
}

export function evaluateProductionCompletionGate(
  files: BuildFile[],
  prompt: string,
): AppCompletionGateResult {
  const recipes = evaluateRecipesAppCompletionGate(files, prompt);
  if (recipes.domain) return recipes;
  return {
    passes: true,
    domain: null,
    missing: [],
    userMessage: "",
    shouldContinue: false,
  };
}
