#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { read, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const t = read(root, "src/components/create/workspace/immersive-workspace.tsx");
const errors = [];
if (!/input\.trim\(\)\.length/.test(t)) errors.push("composer must use trim() for empty check");
if (!/canSendPrompt/.test(t)) errors.push("canSendPrompt required");
finish("verify:space-only-no-send", errors);
