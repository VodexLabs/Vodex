/**
 * Frees port 3000 before `npm run dev` so Next.js does not fall back to 3001
 * (auth cookies and NEXT_PUBLIC_APP_URL are configured for :3000).
 */
import { execSync } from "node:child_process";

const PORT = process.env.PORT || "3000";

function freePortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.includes("LISTENING")) continue;
      const parts = trimmed.split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.info(`[dev] Freed port ${port} (stopped PID ${pid})`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

function freePortUnix(port) {
  try {
    const pid = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
      console.info(`[dev] Freed port ${port} (stopped PID ${pid})`);
    }
  } catch {
    /* nothing listening */
  }
}

if (process.platform === "win32") freePortWindows(PORT);
else freePortUnix(PORT);
