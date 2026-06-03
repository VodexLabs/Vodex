#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const signup = fs.readFileSync(path.join(root, "src/components/auth/signup-view.tsx"), "utf8");
const errors = [];
if (!signup.includes("signup-terms-checkbox")) errors.push("terms checkbox testid");
if (!signup.includes("disabled={anyLoading || !agreed}")) errors.push("oauth disabled without terms");
if (!signup.includes("signup-marketing-opt-in")) errors.push("marketing opt-in");
if (!fs.existsSync(path.join(root, "src/app/api/profile/consent/route.ts"))) errors.push("consent api");
if (!fs.readFileSync(path.join(root, "src/app/auth/callback/route.ts"), "utf8").includes("applySignupConsentToProfile")) {
  errors.push("oauth callback consent");
}
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("✓ verify:signup-consent OK");
