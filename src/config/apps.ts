export type AppStatus = "live" | "staging" | "draft" | "building";

/** Canonical app model */
export type AppRecord = {
  id: string;
  name: string;
  tagline: string;
  status: AppStatus;
  updatedLabel: string;
  branch: string;
  href: string;
  featured?: boolean;
  favorite?: boolean;
  preview: {
    gradient: string;
  };
  metrics?: {
    label: string;
    value: string;
  }[];
  category?: string;
};

/** No hardcoded showcase apps — real apps come from the user's Supabase projects. */
export const showcaseApps: AppRecord[] = [];

/** Returns the user's recent apps. Populated from Supabase in components using the auth store. */
export function getRecentApps(): AppRecord[] {
  return [];
}
