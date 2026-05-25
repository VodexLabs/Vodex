export type NormalizedBuildError = {
  message: string;
  userMessage: string;
  code: string;
  stage: string;
  retryable: boolean;
  mode: string;
  modelId: string;
  operationId: string | null;
  projectId: string | null;
};

export function normalizeBuildError(
  err: unknown,
  ctx: {
    stage: string;
    operationId?: string | null;
    projectId?: string | null;
    mode?: string | null;
    modelId?: string | null;
  },
): NormalizedBuildError {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Build failed unexpectedly";
  const code =
    err instanceof Error && "code" in err && typeof (err as { code?: string }).code === "string"
      ? String((err as { code: string }).code)
      : "build_error";
  const retryable = /timeout|rate|503|429|network/i.test(message);

  return {
    message: message.slice(0, 500),
    userMessage: retryable
      ? "Build hit a temporary issue — try again in a moment."
      : "Build needs repair — we returned your reserved credits.",
    code,
    stage: ctx.stage,
    retryable,
    mode: ctx.mode ?? "build",
    modelId: ctx.modelId ?? "automatic",
    operationId: ctx.operationId ?? null,
    projectId: ctx.projectId ?? null,
  };
}
