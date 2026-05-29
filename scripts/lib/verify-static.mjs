import fs from "node:fs";
import path from "node:path";

export function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function mustExist(root, rel, errors, label = rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) errors.push(`missing ${label}`);
}

export function mustInclude(root, rel, patterns, errors) {
  const text = read(root, rel);
  for (const pat of patterns) {
    const ok = typeof pat === "string" ? text.includes(pat) : pat.test(text);
    if (!ok) errors.push(`${rel}: expected ${String(pat)}`);
  }
}

export function mustExclude(root, rel, patterns, errors) {
  const text = read(root, rel);
  for (const pat of patterns) {
    const bad = typeof pat === "string" ? text.includes(pat) : pat.test(text);
    if (bad) errors.push(`${rel}: must not include ${String(pat)}`);
  }
}

export function finish(name, errors) {
  console.log(`\n=== ${name} ===\n`);
  if (errors.length) {
    errors.forEach((e) => console.error("✗", e));
    process.exit(1);
  }
  console.log("✓ passed");
}
