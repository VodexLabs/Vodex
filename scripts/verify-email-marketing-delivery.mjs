#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const must = (rel, needle, label) => {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(label);
};

must("src/app/api/admin/email-marketing/send/route.ts", "RESEND_API_KEY", "env check");
must("src/app/api/admin/email-marketing/send/route.ts", "deliveredToInbox", "delivery result");
must("src/components/admin/email-marketing-preview.tsx", "min-h-[720px]", "full preview height");
must("src/components/admin/admin-email-recipient-search.tsx", "/api/admin/users/search", "user search");
must("src/app/api/admin/users/search/route.ts", "searchMarketingRecipients", "search route");

if (errors.length) {
  console.error("verify:email-marketing-delivery FAILED\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:email-marketing-delivery OK");
