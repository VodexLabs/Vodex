import type { ZipImportFile } from "@/lib/import/zip-file-validator";
import { buildInitialsIconSvg } from "@/lib/projects/build-initials-icon-svg";
import { isWeakIconSvg } from "@/lib/projects/ensure-project-icon";

const ICON_PATH_PREFS = [
  "public/favicon.svg",
  "public/icon.svg",
  "public/apple-touch-icon.svg",
  "public/logo.svg",
  "src/assets/icon.svg",
  "src/assets/logo.svg",
  "app/icon.svg",
  "favicon.svg",
];

export type DetectedAppIcon = {
  svg: string;
  source: "imported_svg" | "imported_binary" | "manifest" | "initials";
  path?: string;
};

const BINARY_ICON_PATH_PREFS = [
  "public/favicon.png",
  "public/favicon.ico",
  "public/icon.png",
  "public/apple-touch-icon.png",
  "favicon.png",
  "favicon.ico",
];

function normalizeSvg(content: string): string | null {
  const t = content.trim();
  if (!t.includes("<svg")) return null;
  return t;
}

function iconFromManifest(files: ZipImportFile[]): DetectedAppIcon | null {
  const manifest = files.find((f) => /manifest\.json$/i.test(f.path));
  if (!manifest) return null;
  try {
    const json = JSON.parse(manifest.content) as { icons?: Array<{ src?: string }> };
    for (const icon of json.icons ?? []) {
      const src = icon.src?.replace(/^\.\//, "");
      if (!src) continue;
      const hit = files.find((f) => f.path === src || f.path.endsWith(`/${src}`));
      if (hit && hit.path.endsWith(".svg")) {
        const svg = normalizeSvg(hit.content);
        if (svg && !isWeakIconSvg(svg)) return { svg, source: "manifest", path: hit.path };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function iconFromBinaryPath(files: ZipImportFile[], appName: string): DetectedAppIcon | null {
  for (const pref of BINARY_ICON_PATH_PREFS) {
    const hit = files.find((f) => f.path.toLowerCase() === pref);
    if (hit) {
      return { svg: buildInitialsIconSvg(appName), source: "imported_binary", path: hit.path };
    }
  }

  const binaryHit = files.find(
    (f) =>
      /\.(png|ico|webp|jpg|jpeg)$/i.test(f.path) &&
      /(?:favicon|icon|logo|apple-touch)/i.test(f.path) &&
      /(?:^public\/|^src\/assets\/|^assets\/)/i.test(f.path),
  );
  if (binaryHit) {
    return { svg: buildInitialsIconSvg(appName), source: "imported_binary", path: binaryHit.path };
  }

  return null;
}

/** Pick best SVG icon from imported text files, else deterministic initials. */
export function detectAppIconFromImport(files: ZipImportFile[], appName: string): DetectedAppIcon {
  for (const pref of ICON_PATH_PREFS) {
    const hit = files.find((f) => f.path.toLowerCase() === pref);
    if (hit) {
      const svg = normalizeSvg(hit.content);
      if (svg && !isWeakIconSvg(svg)) return { svg, source: "imported_svg", path: hit.path };
    }
  }

  const svgHit = files.find(
    (f) =>
      f.path.endsWith(".svg") &&
      /(?:favicon|icon|logo|apple-touch)/i.test(f.path) &&
      /public\/|assets\//i.test(f.path),
  );
  if (svgHit) {
    const svg = normalizeSvg(svgHit.content);
    if (svg && !isWeakIconSvg(svg)) return { svg, source: "imported_svg", path: svgHit.path };
  }

  const fromManifest = iconFromManifest(files);
  if (fromManifest) return fromManifest;

  const fromBinary = iconFromBinaryPath(files, appName);
  if (fromBinary) return fromBinary;

  return { svg: buildInitialsIconSvg(appName), source: "initials" };
}
