/**
 * P1.3.35 — Preview routes must allow same-origin iframe embedding inside Vodex builder.
 */

export type PreviewIframeUrlMode = "preview-runtime" | "preview-html";

/** Response headers applied by preview-html, preview-runtime, and preview-assets routes. */
export const PREVIEW_IFRAME_EMBED_HEADERS: Readonly<Record<string, string>> = {
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "frame-ancestors 'self'",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Embedder-Policy": "unsafe-none",
};

export type IframeEmbeddabilityAnalysis = {
  iframe_embeddable: boolean;
  iframe_block_reason: string | null;
  iframe_response_headers: Record<string, string | null>;
};

function headerMap(
  headers: Headers | Record<string, string | null | undefined>,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value ?? null;
  }
  return out;
}

/** Analyze whether response headers allow embedding in a same-origin Vodex iframe. */
export function analyzeIframeEmbeddabilityFromHeaders(
  headers: Headers | Record<string, string | null | undefined>,
): IframeEmbeddabilityAnalysis {
  const h = headerMap(headers);
  const iframe_response_headers: Record<string, string | null> = {
    "x-frame-options": h["x-frame-options"] ?? null,
    "content-security-policy": h["content-security-policy"] ?? null,
    "cross-origin-opener-policy": h["cross-origin-opener-policy"] ?? null,
    "cross-origin-embedder-policy": h["cross-origin-embedder-policy"] ?? null,
  };

  const xfo = (h["x-frame-options"] ?? "").trim().toUpperCase();
  if (xfo === "DENY") {
    return {
      iframe_embeddable: false,
      iframe_block_reason: "Blocked by X-Frame-Options: DENY",
      iframe_response_headers,
    };
  }
  if (xfo === "ALLOW-FROM") {
    return {
      iframe_embeddable: false,
      iframe_block_reason: "Blocked by X-Frame-Options: ALLOW-FROM (deprecated; not same-origin safe)",
      iframe_response_headers,
    };
  }

  const csp = (h["content-security-policy"] ?? "").toLowerCase();
  if (csp.includes("frame-ancestors")) {
    if (/frame-ancestors\s+'none'/i.test(csp) || /frame-ancestors\s+none/i.test(csp)) {
      return {
        iframe_embeddable: false,
        iframe_block_reason: "Blocked by CSP frame-ancestors 'none'",
        iframe_response_headers,
      };
    }
    if (!/frame-ancestors[^;]*'self'/i.test(csp) && !/frame-ancestors[^;]*\*/i.test(csp)) {
      return {
        iframe_embeddable: false,
        iframe_block_reason: "Blocked by CSP frame-ancestors (missing 'self')",
        iframe_response_headers,
      };
    }
  }

  const coep = (h["cross-origin-embedder-policy"] ?? "").trim().toLowerCase();
  if (coep === "require-corp") {
    return {
      iframe_embeddable: false,
      iframe_block_reason: "Blocked by Cross-Origin-Embedder-Policy: require-corp",
      iframe_response_headers,
    };
  }

  return {
    iframe_embeddable: true,
    iframe_block_reason: null,
    iframe_response_headers,
  };
}

/** Meta tags inside served HTML can still block embedding even when route headers are safe. */
export function scanHtmlForIframeBlockingMeta(html: string): {
  blocked: boolean;
  reason: string | null;
} {
  if (!html?.trim()) return { blocked: false, reason: null };

  if (/<meta[^>]+http-equiv=["']x-frame-options["'][^>]+content=["']deny["']/i.test(html)) {
    return { blocked: true, reason: "HTML meta X-Frame-Options: DENY" };
  }
  if (
    /<meta[^>]+http-equiv=["']content-security-policy["'][^>]+content=["'][^"']*frame-ancestors[^"']*'none'/i.test(
      html,
    )
  ) {
    return { blocked: true, reason: "HTML meta CSP frame-ancestors 'none'" };
  }
  if (/frame-ancestors\s*['"]?\s*none/i.test(html) && /<meta[^>]+content-security-policy/i.test(html)) {
    return { blocked: true, reason: "HTML meta CSP frame-ancestors none" };
  }
  return { blocked: false, reason: null };
}

/** Remove frame-blocking meta tags from imported app HTML before serve. */
export function stripIframeBlockingMetaFromHtml(html: string): string {
  let out = html;
  out = out.replace(
    /<meta[^>]+http-equiv=["']x-frame-options["'][^>]*>/gi,
    "",
  );
  out = out.replace(
    /<meta[^>]+http-equiv=["']content-security-policy["'][^>]+content=["'][^"']*frame-ancestors[^"']*["'][^>]*>/gi,
    "",
  );
  return out;
}

export function detectPreviewIframeUrlMode(url: string | null | undefined): PreviewIframeUrlMode | null {
  if (!url?.trim()) return null;
  if (url.includes("/preview-runtime/")) return "preview-runtime";
  if (url.includes("/preview-html")) return "preview-html";
  return null;
}

export function mergePreviewIframeEmbedHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  return { ...PREVIEW_IFRAME_EMBED_HEADERS, ...extra };
}
