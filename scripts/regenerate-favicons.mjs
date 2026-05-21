/**
 * Regenerate favicons with ~76% icon fill (larger visual in tab).
 * Run: node scripts/regenerate-favicons.mjs
 */
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "brand", "dreamos86-icon.png");

const sizes = [16, 32, 48, 64, 96, 192, 512];

async function render(size) {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  const resized = await sharp(src).resize(inner, inner, { fit: "contain" }).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: pad, top: pad }])
    .png()
    .toBuffer();
}

for (const size of sizes) {
  const buf = await render(size);
  const out = join(root, "public", size === 512 ? "favicon-512x512.png" : `favicon-${size}x${size}.png`);
  await sharp(buf).toFile(out);
  console.log("wrote", out);
}

await sharp(await render(32)).toFile(join(root, "public", "favicon.ico"));
await sharp(await render(48)).toFile(join(root, "public", "icon.png"));
await sharp(await render(180)).toFile(join(root, "public", "apple-touch-icon.png"));
console.log("done");
