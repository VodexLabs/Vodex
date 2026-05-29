#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const pid = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchFile(p) {
  const r = await fetch(
    `${url}/rest/v1/app_files?project_id=eq.${pid}&path=eq.${encodeURIComponent(p)}&select=content`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const j = await r.json();
  return j[0]?.content ?? "";
}

const listRes = await fetch(
  `${url}/rest/v1/app_files?project_id=eq.${pid}&select=path`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
const paths = (await listRes.json()).map((x) => x.path);
console.log("files:", paths.length);
console.log(paths.join("\n"));

const content = await fetchFile("app/page.tsx");
console.log("page.tsx length:", content.length);
console.log(content.slice(0, 2000));
const missing = ["EventGrid", "SalesKPI"].filter(
  (c) => !paths.some((p) => p.includes(c)),
);
console.log("missing_imported_components:", missing);
const hasTodo = /TODO|coming soon|placeholder/i.test(content);
console.log("has_blocking_placeholder:", hasTodo);
