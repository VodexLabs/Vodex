#!/usr/bin/env node
import { mustInclude, mustNotMatch, read, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
const src = read("src/components/mobile/mobile-wrapper-studio.tsx");
const normalSection = src.split("Advanced")[0] ?? src;

mustInclude("src/components/mobile/mobile-wrapper-studio.tsx", "Android app", "android app copy", errors);
mustInclude("src/components/mobile/mobile-wrapper-studio.tsx", "iPhone app", "iphone app copy", errors);
mustInclude("src/components/mobile/mobile-wrapper-studio.tsx", "Store-ready project", "store-ready build", errors);

if (/capacitor|twa|webhook|sha-256|assetlinks/i.test(normalSection)) {
  errors.push("Capacitor/TWA/webhook terms leak into normal mobile UI");
}
if (/package ID|bundle ID/i.test(normalSection)) {
  errors.push("package/bundle ID jargon in normal mobile section");
}

mustNotMatch("src/components/mobile/mobile-wrapper-studio.tsx", /Wrapper project \(ZIP\)/, "no wrapper zip label", errors);
exitReport("verify:mobile-wrapper-user-safe-copy", errors, errors.length ? [] : ["mobile wrapper user copy ok"]);
