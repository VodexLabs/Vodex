#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustInclude(root, "src/lib/create/queue-constants.ts", ["PROMPT_QUEUE_MAX = 8"], errors);
mustInclude(root, "src/components/create/workspace/immersive-workspace.tsx", ["PROMPT_QUEUE_MAX", "PROMPT_QUEUE_FULL_MESSAGE"], errors);

finish("verify:queue-limit-eight", errors);
