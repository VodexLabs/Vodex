/**
 * Strips gray/white checkerboard from generated bird PNG and exports
 * a transparent, footer-optimized asset.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const INPUT = path.join(ROOT, "assets", "icy-bird-static.png");
const OUTPUT = path.join(ROOT, "public", "footer", "icy-bird-static.png");

function isBackgroundPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;

  // Keep saturated icy blues / cyans / purples (bird + trail)
  if (b > r + 8 && sat > 0.06) return false;
  if (sat > 0.18) return false;
  if (max > 60 && b > r + 4 && g > r) return false;

  // Neutral gray / white checkerboard
  const neutral = Math.abs(r - g) < 22 && Math.abs(g - b) < 22;
  if (neutral && max > 85) return true;

  return max < 40;
}

async function main() {
  const { data, info } = await sharp(INPUT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (isBackgroundPixel(r, g, b)) {
      out[i + 3] = 0;
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ width: 420, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(OUTPUT);

  const meta = await sharp(OUTPUT).metadata();
  console.log(`Wrote ${OUTPUT} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
