import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import type { FailedStage } from "./restaurant-qa";

export const FINAL_FAILURE_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/restaurant-final-failure.json",
);

export type RestaurantFinalFailure = {
  capturedAt: string;
  stage: FailedStage | "dev_server" | "credits" | "app_files";
  code?: string;
  message: string;
  url?: string;
  auth?: {
    userResolved?: boolean;
    userId?: string | null;
    email?: string | null;
    cookieNames?: string[];
    sessionError?: string | null;
    creditsStatus?: number;
    onboardingCompleted?: boolean | null;
  };
  projectId?: string;
  buildJobId?: string;
  lastEvent?: string;
  fileCount?: number;
  previewSession?: unknown;
  publishResponse?: unknown;
  consoleErrors?: string[];
  networkErrors?: string[];
  serverLogTail?: string;
  localStorageKeys?: string[];
};

function redactLocalStorage(page: Page): Promise<string[]> {
  return page
    .evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys;
    })
    .catch(() => []);
}

export async function writeRestaurantFinalFailure(
  input: Omit<RestaurantFinalFailure, "capturedAt"> & { page?: Page },
): Promise<void> {
  const dir = path.dirname(FINAL_FAILURE_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const payload: RestaurantFinalFailure = {
    capturedAt: new Date().toISOString(),
    ...input,
    localStorageKeys: input.page ? await redactLocalStorage(input.page) : input.localStorageKeys,
  };
  fs.writeFileSync(FINAL_FAILURE_PATH, JSON.stringify(payload, null, 2));
}
