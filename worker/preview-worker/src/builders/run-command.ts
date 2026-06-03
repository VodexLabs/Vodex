import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config.js";
import { redactSecrets } from "../logger.js";

const execFileAsync = promisify(execFile);

export async function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ ok: boolean; logs: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, NODE_ENV: "production", CI: "true" },
    });
    return {
      ok: true,
      logs: redactSecrets(`${stdout}\n${stderr}`),
    };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      logs: redactSecrets(`${err.stdout ?? ""}\n${err.stderr ?? err.message ?? "failed"}`),
    };
  }
}

export async function npmInstall(cwd: string, pm: "npm" | "pnpm" | "yarn"): Promise<{ ok: boolean; logs: string }> {
  const ignoreScripts = config.allowNpmScripts ? [] : ["--ignore-scripts"];
  if (pm === "pnpm") {
    return runCommand("pnpm", ["install", "--frozen-lockfile", ...ignoreScripts], cwd, config.installTimeoutMs);
  }
  if (pm === "yarn") {
    return runCommand("yarn", ["install", ...ignoreScripts], cwd, config.installTimeoutMs);
  }
  const hasLock = await import("node:fs/promises")
    .then((fs) => fs.access(`${cwd}/package-lock.json`).then(() => true))
    .catch(() => false);
  const args = hasLock ? ["ci", ...ignoreScripts] : ["install", ...ignoreScripts];
  return runCommand("npm", args, cwd, config.installTimeoutMs);
}

export async function npmRunBuild(
  cwd: string,
  pm: "npm" | "pnpm" | "yarn",
  script = "build",
): Promise<{ ok: boolean; logs: string }> {
  if (pm === "yarn") {
    return runCommand("yarn", [script], cwd, config.buildTimeoutMs);
  }
  return runCommand("npm", ["run", script], cwd, config.buildTimeoutMs);
}
