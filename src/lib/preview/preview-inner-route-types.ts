/** postMessage payload when imported app routes to platform preview path inside iframe. */

export type PreviewInnerRouteErrorMessage = {
  type: "vodex-preview-inner-error";
  kind: "inner_next_route_404";
  path: string;
  details: {
    title?: string;
    bodySnippet?: string;
    detectedAt?: string;
  };
};

export function isPreviewInnerRouteErrorMessage(
  data: unknown,
): data is PreviewInnerRouteErrorMessage {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.type === "vodex-preview-inner-error" &&
    d.kind === "inner_next_route_404" &&
    typeof d.path === "string"
  );
}
