export type SecretGuidePlatform =
  | "Base44"
  | "Firebase"
  | "Supabase"
  | "Stripe"
  | "OpenAI"
  | "Google Cloud"
  | "Vodex"
  | "Imported app"
  | "Vite env"
  | "Public env"
  | "Database"
  | "Other";

export type SecretGuide = {
  platform: SecretGuidePlatform;
  why: string;
  whereToGet: string;
  steps: string[];
  link?: { label: string; href: string };
  optionalNote?: string;
};

const LINKS = {
  firebase: "https://console.firebase.google.com/",
  googleCloud: "https://console.cloud.google.com/",
  supabase: "https://supabase.com/dashboard",
  stripe: "https://dashboard.stripe.com/",
  openai: "https://platform.openai.com/api-keys",
  base44: "https://base44.com/",
} as const;

function hasBase44Markers(envKeys: string[]): boolean {
  return envKeys.some((k) => /^VITE_BASE44_/i.test(k) || /^BASE44_/i.test(k));
}

export function detectSecretGuide(
  key: string,
  envKeys: string[] = [],
  base44ProjectUrl?: string | null,
): SecretGuide {
  const upper = key.toUpperCase();
  const imported = hasBase44Markers(envKeys);

  if (upper === "DEV" || upper === "VITE_DEV") {
    return {
      platform: imported ? "Imported app" : "Vite env",
      why: "DEV looks like an imported environment flag from the original project.",
      whereToGet: imported
        ? "Original app project → Environment variables / .env file"
        : "Original project .env or hosting environment variables",
      steps: [
        "Open the original app project",
        "→ Environment variables / .env",
        "→ copy DEV value",
        "→ paste here",
      ],
      optionalNote: "Usually optional — skip unless the app code checks DEV.",
    };
  }

  if (upper === "DEBUG_BLOCKS" || upper === "VITE_DEBUG_BLOCKS") {
    return {
      platform: "Imported app",
      why: "DEBUG_BLOCKS controls debug/dev-only UI blocks in the imported project.",
      whereToGet: "Original project .env file",
      steps: ["Original project .env", "→ find DEBUG_BLOCKS", "→ paste value", "or skip if app runs without debug blocks"],
      optionalNote: "Optional — skip if the app runs without debug blocks.",
    };
  }

  if (upper.includes("FIREBASE") || upper.startsWith("VITE_FIREBASE_")) {
    if (upper.includes("API_KEY")) {
      return {
        platform: "Firebase",
        why: "Firebase Web SDK apiKey for client-side Firebase init.",
        whereToGet: "Firebase Console → Project settings → General → Your apps → Web app → SDK setup",
        steps: [
          "Firebase Console",
          "→ Project settings → General",
          "→ Your apps → Web app",
          "→ SDK setup / config",
          "→ copy apiKey",
        ],
        link: { label: "Firebase Console", href: LINKS.firebase },
      };
    }
    if (upper.includes("PROJECT_ID")) {
      return {
        platform: "Firebase",
        why: "Firebase project identifier used by the SDK.",
        whereToGet: "Firebase Console → Project settings → General → Project ID",
        steps: ["Firebase Console", "→ Project settings → General", "→ copy Project ID"],
        link: { label: "Firebase Console", href: LINKS.firebase },
      };
    }
    return {
      platform: "Firebase",
      why: "Firebase configuration value for the imported app.",
      whereToGet: "Firebase Console → Project settings",
      steps: ["Firebase Console", "→ Project settings", "→ copy the matching field"],
      link: { label: "Firebase Console", href: LINKS.firebase },
    };
  }

  if (upper.includes("SUPABASE")) {
    const field = upper.includes("URL") ? "Project URL" : upper.includes("ANON") ? "anon public key" : "API key";
    return {
      platform: "Supabase",
      why: upper.includes("SERVICE") ? "Server-side Supabase access — never expose to browser" : "Database and authentication for the app",
      whereToGet: `Supabase Dashboard → Project Settings → API → ${field}`,
      steps: ["Supabase Dashboard", "→ Project Settings → API", `→ copy ${field}`],
      link: { label: "Supabase Dashboard", href: LINKS.supabase },
    };
  }

  if (upper.includes("STRIPE")) {
    return {
      platform: "Stripe",
      why: "Payment processing",
      whereToGet: "Stripe Dashboard → Developers → API keys",
      steps: ["Stripe Dashboard", "→ Developers → API keys", "→ copy the matching key"],
      link: { label: "Stripe Dashboard", href: LINKS.stripe },
    };
  }

  if (upper.includes("OPENAI")) {
    return {
      platform: "OpenAI",
      why: "OpenAI API access for the app",
      whereToGet: "OpenAI platform → API keys",
      steps: ["platform.openai.com", "→ API keys", "→ Create secret key"],
      link: { label: "OpenAI API keys", href: LINKS.openai },
    };
  }

  if (imported && (upper.startsWith("VITE_") || upper.startsWith("NEXT_PUBLIC_"))) {
    return {
      platform: imported ? "Base44" : "Imported app",
      why: "Detected from the imported project's environment file.",
      whereToGet: base44ProjectUrl
        ? "Original Base44 project settings"
        : "Original app .env or hosting environment",
      steps: [
        base44ProjectUrl ? "Base44 project settings" : "Original app project",
        "→ Environment variables",
        `→ copy ${key}`,
      ],
      link: base44ProjectUrl ? { label: "Base44 project", href: base44ProjectUrl } : imported ? { label: "Base44", href: LINKS.base44 } : undefined,
    };
  }

  if (upper.startsWith("VITE_")) {
    return {
      platform: "Vite env",
      why: "Vite environment variable bundled or read at build/runtime.",
      whereToGet: "Original Vite project .env file",
      steps: ["Original project .env", `→ find ${key}`, "→ paste value"],
    };
  }

  if (upper.startsWith("NEXT_PUBLIC_")) {
    return {
      platform: "Public env",
      why: "Public env value exposed to the browser bundle.",
      whereToGet: "Original Next.js project .env file",
      steps: ["Original project .env.local / .env", `→ find ${key}`, "→ paste value"],
    };
  }

  return {
    platform: "Imported app",
    why: "Required by your imported app at runtime.",
    whereToGet: "Original app provider dashboard or .env file",
    steps: ["Identify the service this key belongs to", "→ open that provider's console", `→ copy ${key}`, "→ paste here"],
  };
}

export const SECRET_GUIDE_LINKS = Object.values(LINKS);
