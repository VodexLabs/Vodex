/**
 * DreamOS86 Help Center — article registry
 *
 * Each article has:
 *  - slug: URL path segment
 *  - title, description, category, readMinutes
 *  - content: MDX-style markdown (rendered as-is with prose styles)
 */

export interface DocArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  readMinutes: number;
  content: string;
}

export const DOCS: DocArticle[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Create your first app with DreamOS86 in under five minutes.",
    category: "Getting Started",
    readMinutes: 3,
    content: `## What is DreamOS86?

DreamOS86 is an AI-native app creation platform. Describe what you want to build, and the AI generates a complete, deployable codebase — frontend, backend, database, auth, and billing included.

## Create your first app

1. Open the **Create** page (the home screen).
2. Type a description of your app in the prompt box. Be specific — the more detail you provide, the better the result.
3. Click **Create** or press \`⌘ Enter\`.
4. DreamOS86 generates your project and opens it in the workspace.

## Workspace overview

Your workspace contains:

- **Chat** — talk to the AI to modify your app
- **Projects** — all your apps
- **Deploy** — deploy and manage live environments
- **Settings** — billing, API keys, integrations

## Next steps

- [How AI Chat Works](/help/docs/how-ai-chat-works)
- [Setting up Supabase](/help/docs/supabase-setup)
- [Publishing to the Play Store](/help/docs/play-store-setup)
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "how-ai-chat-works",
    title: "How AI Chat Works",
    description: "Understand the AI modes, context window, and how to get the best results.",
    category: "AI Modes",
    readMinutes: 5,
    content: `## AI modes

DreamOS86 runs in four modes, each with different capabilities and costs:

| Mode | What it does | Cost |
|------|-------------|------|
| **Discuss** | Answers questions, explains code, suggests approaches | Low |
| **Edit** | Makes targeted edits to specific files | Medium |
| **Agent** | Autonomously completes multi-step tasks | High |
| **Build** | Compiles, deploys, and publishes | High |

Switch modes with the mode selector in the chat input bar.

## Discuss mode

Discuss mode is best for:
- Understanding existing code
- Planning features before building
- Getting explanations of errors
- Exploring options without committing

Discuss mode never modifies your files. It uses a cheaper model with a lighter context, which keeps costs low.

## Edit mode

Edit mode makes targeted changes. Use it when you know exactly what to change:

> "Update the login button style to match the accent color"
> "Add email validation to the signup form"

## Agent mode

Agent mode is fully autonomous. The AI reads your codebase, plans a sequence of changes, and executes them in order. Use it for:

> "Add a complete password reset flow"
> "Integrate Stripe subscriptions with webhook handling"

Agent mode requires the most credits but handles the most complex tasks.

## Context window

The AI automatically includes relevant files in its context window. You can pin specific files by clicking the paperclip icon in the chat input. The context indicator shows how many tokens are in use.

## Tips for better results

- **Be specific.** Instead of "make it better," say "reduce the gap between the logo and the nav by 8px."
- **Include the why.** "Add loading states — the button freezes when the API is slow" gives better results than "add a spinner."
- **Use Discuss first.** Before asking Agent to implement something complex, ask in Discuss mode to confirm the plan.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "supabase-setup",
    title: "Supabase Setup",
    description: "Connect your project to Supabase for auth, database, and realtime.",
    category: "Integrations",
    readMinutes: 7,
    content: `## Prerequisites

- A [Supabase account](https://supabase.com)
- A Supabase project (free tier works)

## Step 1: Get your credentials

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **Settings → API**
3. Copy:
   - **Project URL** (looks like \`https://xyzabc.supabase.co\`)
   - **Anon key** (also called "publishable key")

## Step 2: Add to DreamOS86

Open **Settings → Integrations** and paste both values. Or add them directly to your project's environment variables:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

## Step 3: Configure redirect URLs

1. In Supabase: **Auth → URL Configuration**
2. Add your app URL to **Redirect URLs**:
   - \`http://localhost:3000/auth/callback\` (development)
   - \`https://yourdomain.com/auth/callback\` (production)

## Row Level Security (RLS)

Supabase uses RLS to secure your tables. Every generated project enables RLS by default. The AI generates appropriate policies, but you should review them:

- **Auth policies**: Users can only read/write their own data
- **Public tables**: Explicitly marked as world-readable
- **Admin routes**: Protected by \`is_admin\` flag on the \`profiles\` table

## Database types

When you modify your schema, regenerate the TypeScript types:

\`\`\`bash
npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/types.ts
\`\`\`

## Troubleshooting

**"Your project's URL and API key are required"**
→ Check that \`NEXT_PUBLIC_SUPABASE_URL\` and \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` are set in your \`.env.local\` file.

**"User not found" after login**
→ Make sure your \`profiles\` table has a trigger on \`auth.users\` to create profiles on signup.

**OAuth not working**
→ Enable the provider in Supabase → **Auth → Providers**, and add the callback URL to the provider's allowed redirect URIs.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "play-store-setup",
    title: "Play Store Setup",
    description: "Publish your DreamOS86 app to the Google Play Store.",
    category: "Mobile Publishing",
    readMinutes: 10,
    content: `## Overview

DreamOS86 supports publishing web apps to the Play Store using **Trusted Web Activities (TWA)** via Capacitor. The flow is:

1. Build your web app
2. Wrap it in a TWA shell
3. Generate a signed APK/AAB
4. Upload to Play Console

## Step 1: Configure your package ID

Your app's package ID must be unique (e.g. \`com.yourcompany.yourapp\`). Set it in your project settings:

\`\`\`
Settings → Mobile → Package ID
\`\`\`

## Step 2: Generate your SHA256 fingerprints

You need **three fingerprints** for full Play Store compatibility:

| Type | Use |
|------|-----|
| Upload key SHA256 | Signs your APK for Play Console upload |
| Play App Signing SHA256 | Google re-signs your app for distribution |
| Debug SHA256 | For local testing with Firebase |

To get your Play App Signing fingerprint:
1. Play Console → Your app → Release → Setup → App signing
2. Copy the SHA256 certificate fingerprint

Add all three to **Settings → Mobile → SHA256 Fingerprints**.

## Step 3: Configure TWA manifest

The TWA manifest links your Android app to your web domain. Add to \`assetlinks.json\`:

\`\`\`json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourcompany.yourapp",
    "sha256_cert_fingerprints": [
      "YOUR_PLAY_APP_SIGNING_SHA256",
      "YOUR_UPLOAD_KEY_SHA256"
    ]
  }
}]
\`\`\`

Host this at \`https://yourdomain.com/.well-known/assetlinks.json\`.

## Step 4: Build and upload

From the **Deploy** tab:
1. Select your project
2. Click **Build for Android**
3. Download the AAB file
4. Upload to Play Console → Production

## Troubleshooting

**"Digital Asset Links verification failed"**
→ Check that \`/.well-known/assetlinks.json\` is publicly accessible and contains the correct SHA256.

**App shows as browser, not TWA**
→ Asset links file is missing or has wrong fingerprints. Check all three SHA256 values.

**"Package name already taken"**
→ Choose a different package ID. Once published, it cannot be changed.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "zip-import",
    title: "ZIP Import & Project Restoration",
    description: "Import an existing project ZIP and restore it inside DreamOS86.",
    category: "ZIP Imports",
    readMinutes: 6,
    content: `## What ZIP import does

ZIP import lets you bring an existing codebase into DreamOS86. The import pipeline:

1. **Uploads** your ZIP
2. **Extracts** the archive
3. **Detects** frameworks, integrations, and config files
4. **Reconstructs** the project model
5. **Opens** the workspace

## Supported project types

| Framework | Detection |
|-----------|-----------|
| Next.js | \`next.config.js/ts\` |
| React / Vite | \`vite.config.ts\` |
| Expo | \`app.json\` with \`expo\` key |
| Capacitor | \`capacitor.config.ts\` |
| TWA | \`twa-manifest.json\` |

## Supported integrations detected

- Supabase (\`@supabase/supabase-js\`, \`@supabase/ssr\`)
- Firebase (\`firebase\` package, \`firebase.json\`)
- Stripe (\`stripe\`, \`@stripe/stripe-js\`)
- Prisma (\`schema.prisma\`)
- Tailwind (\`tailwind.config.*\`)

## How to import

1. Go to **Projects → Import ZIP**
2. Upload your ZIP file (max 100MB)
3. Watch the detection pipeline run
4. Review the detected technologies
5. Click **Open in Workspace**

## What gets restored

✅ Source files and directory structure
✅ \`package.json\` and dependencies list
✅ Environment variable names (not values — add secrets manually)
✅ Framework configuration
✅ Route structure
✅ Integration configuration

⚠️ Not restored:
- Secret values (API keys, passwords)
- Database contents
- Deployment history

## After import

Once imported, you can use the AI to continue building:

> "This is an existing Next.js app. Add a Stripe subscription page."
> "Review this codebase and suggest improvements to the auth flow."

## Troubleshooting

**"Framework not detected"**
→ Make sure your ZIP includes the root config files (\`package.json\`, \`next.config.ts\`, etc.) at the top level, not inside a subdirectory.

**"ZIP too large"**
→ Exclude \`node_modules\` and \`.next\` from your ZIP. Only source files are needed.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "environment-variables",
    title: "Environment Variables",
    description: "Manage secrets and configuration across local, preview, and production environments.",
    category: "Configuration",
    readMinutes: 4,
    content: `## How environment variables work

DreamOS86 projects use standard Next.js environment variables:

- **\`NEXT_PUBLIC_\` prefix**: Exposed to the browser and server. Safe for non-secret config like Supabase URL.
- **No prefix**: Server-only. Never sent to the browser. Use for API keys and secrets.

## Required variables

Every DreamOS86 project needs these:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL (set this for production deployments)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
\`\`\`

## Common optional variables

\`\`\`env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# AI providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Email
RESEND_API_KEY=re_...
\`\`\`

## Local development

Create a \`.env.local\` file in your project root. This file is git-ignored by default.

## Production

Set environment variables in your deployment platform (Vercel, Railway, Fly.io) under your project's environment settings.

## NEXT_PUBLIC_APP_URL

This is required for correct OAuth redirects and email links in production. Set it to your canonical domain:

\`\`\`env
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
\`\`\`

Without this, redirects fall back to \`window.location.origin\`, which works in most cases but can misbehave behind proxies or CDNs.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "billing-credits",
    title: "Billing & Credits",
    description: "How DreamOS86 credits work, plan limits, and how to manage your subscription.",
    category: "Billing",
    readMinutes: 4,
    content: `## How credits work

Credits are consumed when you run AI actions. Different modes use different amounts:

| Mode | Credits per action |
|------|-------------------|
| Discuss | ~2 credits |
| Edit | ~10 credits |
| Agent | ~50–200 credits |
| Build | ~100–300 credits |

The exact cost depends on the model used and the length of the context.

## Plans

| Plan | Monthly credits | Price |
|------|----------------|-------|
| Free | 100 | $0 |
| Starter | 1,000 | $9/mo |
| Pro | 10,000 | $29/mo |
| Team | 50,000 | $99/mo |

## Checking your balance

Your credit balance is always visible in the top bar. Click it to see usage history and top up.

## Auto top-up

Enable auto top-up in **Settings → Billing** to automatically purchase credits when your balance drops below a threshold.

## Plan management

- Upgrade or downgrade any time from **Settings → Billing**
- Credits reset at the start of each billing cycle
- Unused credits do not roll over (except on annual plans)

## Viewing usage

**Settings → Billing → Usage** shows:
- Credits consumed per day
- Breakdown by mode (Discuss/Edit/Agent/Build)
- Cost per project

## Enterprise

For teams needing custom limits, SSO, or invoicing, contact sales.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "github-integration",
    title: "GitHub Integration",
    description: "Connect GitHub to enable version control, PR-based deployments, and code sync.",
    category: "Integrations",
    readMinutes: 5,
    content: `## What the GitHub integration does

- Push generated code to a repository
- Create pull requests for AI-generated changes
- Trigger deployments on merge
- Sync code between DreamOS86 and your local environment

## Connecting GitHub

1. Go to **Settings → Integrations → GitHub**
2. Click **Connect**
3. Authorise DreamOS86 on GitHub (OAuth flow)
4. Select which repositories to grant access to

## Pushing to a repository

Once connected, every project can be linked to a GitHub repository:

1. Open your project → **Settings**
2. Under **Version Control**, select or create a repository
3. Click **Push to GitHub**

## Pull requests

When Agent mode makes significant changes, it can create a pull request for review instead of pushing directly to main. Enable this in project settings:

\`\`\`
Project Settings → Version Control → Create PRs for agent changes
\`\`\`

## Local development

Clone your generated project to work locally:

\`\`\`bash
git clone https://github.com/yourorg/your-project.git
cd your-project
npm install
cp .env.local.example .env.local
# Fill in your .env.local values
npm run dev
\`\`\`

## Disconnecting

**Settings → Integrations → GitHub → Disconnect**

This removes DreamOS86's access to your repositories. Existing code is unaffected.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "how-credits-work",
    title: "How Credits Work",
    description: "Understand how DreamOS86 credits are calculated, why different actions cost different amounts, and how to use them efficiently.",
    category: "Billing",
    readMinutes: 5,
    content: `## What are credits?

Credits are DreamOS86's unit of AI usage. When you send a message, generate code, deploy an app, or run an agent, the platform consumes credits. Your plan includes a monthly credit allowance, and you can purchase more at any time.

## Why do different actions cost different amounts?

Every AI action involves one or more underlying operations — sending your prompt to a model, receiving a response, running tools, accessing files, or executing builds. Each of these has a cost.

DreamOS86 translates these internal costs into clean, predictable credit amounts so you always know roughly what an action will cost before you run it.

### Models vary in capability and cost

A more powerful model (like Claude Opus or GPT-4.5) produces higher-quality results but requires more compute. A faster, lighter model (like Claude Haiku or Gemini Flash) is cheaper per message but less capable on complex tasks.

| Model tier | Relative cost |
|---|---|
| Lightweight (e.g. Haiku, Gemini Flash) | Low |
| Standard (e.g. Sonnet, GPT-4o) | Medium |
| Premium (e.g. Opus, GPT-4.5) | High |

You can always switch models in the chat input bar.

### Modes affect cost too

DreamOS86 has four modes — **Discuss**, **Edit**, **Agent**, and **Build** — each with different capabilities and costs.

| Mode | What it does | Relative cost |
|---|---|---|
| Discuss | Answers questions, explains, brainstorms. No file changes. | Lowest |
| Edit | Makes targeted code edits to specific files. | Medium |
| Agent | Autonomously completes multi-step tasks. | High |
| Build | Compiles, deploys, and publishes your app. | Highest |

**Discuss mode** is the most cost-efficient. If you're planning features, reviewing code, or exploring options — use Discuss mode to conserve credits.

**Build mode** is the most expensive because it runs real compilation and deployment pipelines, not just inference.

## How credit costs are calculated

When you take an action, DreamOS86 measures:

1. **Tokens processed** — how much text was sent to the model and returned
2. **Tools used** — file reads, web searches, code execution
3. **Mode overhead** — orchestration work required for the selected mode
4. **Infrastructure** — routing, caching, storage, reliability systems

These are combined into a single credit total, rounded to a clean whole number.

## How to reduce your credit usage

- **Use Discuss mode for planning.** Don't use Agent mode to answer a question you could ask in Discuss.
- **Use lighter models for simple tasks.** Claude Haiku and Gemini Flash handle most everyday coding questions well.
- **Be specific in your prompts.** Shorter, clearer prompts use fewer tokens.
- **Avoid re-running agents on already-solved problems.** If an agent already solved something, reference the output rather than running again.

## What happens when I run out of credits?

When your balance reaches zero, AI actions are paused. You can:

- **Upgrade your plan** to get more monthly credits at a lower per-credit rate
- **Purchase a credit top-up** for additional credits without changing your plan
- **Wait for your monthly reset** — credits refresh automatically on your renewal date

Your renewal date is exactly one billing cycle after your subscription started (e.g., if you subscribed on May 16, your credits refresh every June 16, July 16, etc.).

## Do unused credits carry over?

Monthly plan credits reset each billing cycle. They do not roll over.

If you upgrade your plan mid-cycle, your used credits carry forward — you won't lose progress. For example, if you used 100 out of 500 credits on the Starter plan and upgrade to Pro (5,000 credits), your balance becomes 100 / 5,000 used — not 0 / 5,000.

## Credit packs

Credit packs let you purchase additional credits that never expire, separately from your plan. They're charged once and available until consumed. Packs are useful for one-time large projects (like migrating an existing app or running a complex build pipeline).

## Questions?

If you believe credits were charged incorrectly, contact support with the conversation ID. We can review exact token counts and usage logs.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "oauth-setup",
    title: "Google & GitHub OAuth Setup",
    description: "Enable Google and GitHub sign-in for your DreamOS86 account and generated apps.",
    category: "Integrations",
    readMinutes: 6,
    content: `## Overview

DreamOS86 uses Supabase Auth for all authentication, including OAuth providers. The platform supports **Google** and **GitHub** sign-in out of the box.

## Setting up Google OAuth

### 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services → Credentials**

### 2. Create OAuth credentials

1. Click **Create Credentials → OAuth client ID**
2. Select **Web application**
3. Add your authorised redirect URIs:
   - \`http://localhost:3000/auth/callback\` (development)
   - \`https://yourdomain.com/auth/callback\` (production)
   - Add the Supabase callback too: \`https://your-project.supabase.co/auth/v1/callback\`

### 3. Configure Supabase

1. Go to your [Supabase project dashboard](https://supabase.com/dashboard)
2. **Auth → Providers → Google**
3. Enable Google, paste your **Client ID** and **Client Secret**

### 4. Add redirect URLs to Supabase

**Auth → URL Configuration → Redirect URLs:**
- \`http://localhost:3000/auth/callback\`
- \`https://dreamos86.com/auth/callback\`

---

## Setting up GitHub OAuth

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps → New OAuth App**
3. Set:
   - **Homepage URL**: \`https://dreamos86.com\`
   - **Authorization callback URL**: \`https://your-project.supabase.co/auth/v1/callback\`

### 2. Configure Supabase

1. **Auth → Providers → GitHub**
2. Enable GitHub, paste your **Client ID** and **Client Secret**

### 3. Add redirect URLs

Same as Google — add both localhost and production URLs to Supabase's allowed redirect list.

---

## Testing OAuth locally

Google and GitHub OAuth both work on \`localhost:3000\` as long as:
1. \`http://localhost:3000/auth/callback\` is in your Supabase redirect URLs
2. The Google Cloud credentials have \`http://localhost:3000/auth/callback\` as an authorised URI
3. Your \`NEXT_PUBLIC_APP_URL=http://localhost:3000\` in \`.env.local\`

## Troubleshooting

**"Provider not enabled"**
→ The provider hasn't been enabled in Supabase Auth settings.

**"Redirect URI mismatch"**
→ The URL your app is redirecting to doesn't match exactly what's registered in Google Console or Supabase. Check for trailing slashes.

**"callback_failed" error after OAuth**
→ Usually a network error or SSL certificate issue in local development. The \`src/instrumentation.ts\` file in your project automatically handles SSL certificate issues on Windows in development.

**Session not persisting after OAuth login**
→ Ensure your middleware is refreshing the session on every request and that cookies are being set correctly.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "deployment",
    title: "Deploying Your App",
    description: "Deploy your generated app to production with Vercel, custom domains, and environment management.",
    category: "Deployment",
    readMinutes: 6,
    content: `## Overview

DreamOS86 generates production-ready Next.js apps. Deployment targets:

| Platform | Notes |
|----------|-------|
| **Vercel** | Recommended. Zero-config, instant deploys |
| **Railway** | Great for full-stack with databases |
| **Fly.io** | Best for global edge deployments |
| **Self-hosted** | Any Node.js-capable server |

---

## Deploying to Vercel

### 1. Connect your repository

1. Push your project to GitHub via **Settings → Integrations → GitHub**
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository

### 2. Set environment variables

In Vercel project settings → **Environment Variables**, add all variables from your \`.env.local.example\`:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL=https://yourdomain.com
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ANTHROPIC_API_KEY
\`\`\`

### 3. Set NEXT_PUBLIC_APP_URL

This is critical for OAuth redirects to work in production:
\`\`\`
NEXT_PUBLIC_APP_URL=https://yourdomain.com
\`\`\`

Without this, OAuth callbacks will redirect to the wrong URL.

### 4. Update Supabase redirect URLs

Add your production domain to **Supabase → Auth → URL Configuration → Redirect URLs**:
\`\`\`
https://yourdomain.com/auth/callback
\`\`\`

---

## Custom domains

### Vercel
1. Vercel project → **Settings → Domains**
2. Add your domain
3. Update your DNS: add a CNAME pointing to \`cname.vercel-dns.com\`

### Supabase redirect URLs
After adding your domain, update the allowed redirect URLs in Supabase to include your new domain.

---

## Deployment environments

DreamOS86 supports three environments:

| Environment | Branch | Purpose |
|-------------|--------|---------|
| **Production** | \`main\` | Live site |
| **Preview** | Any PR | PR preview URLs |
| **Staging** | \`staging\` | Pre-release testing |

---

## Rollbacks

To roll back to a previous deployment:
1. **DreamOS86 → Deploy → Deployment History**
2. Find the deployment you want to restore
3. Click **Rollback**

This triggers a re-deployment of the selected build.

---

## Troubleshooting

**Build failing after deploy**
→ Check that all required environment variables are set in Vercel. The most common cause is missing \`NEXT_PUBLIC_SUPABASE_URL\`.

**OAuth not working in production**
→ Update \`NEXT_PUBLIC_APP_URL\` to your production domain and add the domain to Supabase's allowed redirect list.

**Webhook not firing**
→ Set the webhook endpoint in Stripe Dashboard to your production URL, and update \`STRIPE_WEBHOOK_SECRET\` with the production signing secret.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "model-routing",
    title: "AI Model Routing",
    description: "How DreamOS86 selects AI models, and how to customise model selection for your projects.",
    category: "AI Modes",
    readMinutes: 5,
    content: `## Auto mode

By default, DreamOS86 uses **Auto** mode to select the best model for each task. Auto routing considers:

- **Task type** — simple edit vs. complex architecture
- **Context length** — how many tokens your request requires
- **Budget** — your remaining credits and plan tier
- **Speed requirement** — whether you need a quick response or can wait for higher quality

## Manual model selection

You can override the auto-selected model at any time using the model picker in the chat input bar.

## Orchestration modes

When creating an app from the home screen, you can choose an orchestration mode:

| Mode | Runtime | Model strategy |
|------|---------|----------------|
| **Fast** | 8–20s | Lightweight models throughout |
| **Balanced** | 25–45s | Mixes lightweight and standard |
| **Deep Build** | 50–90s | Standard + premium for architecture |
| **Production** | 80–120s | Premium models with quality verification |
| **Autonomous** | 90–180s | Agentic loop with self-review |

## Model tiers

| Tier | Models | Credit cost |
|------|--------|-------------|
| **Standard** | Claude Haiku, Gemini Flash, GPT-5.4 Mini | Low |
| **Premium** | Claude Sonnet, GPT-5.4, Gemini Pro | Medium |
| **Ultra** | Claude Opus, GPT-5.5, Grok 4 | High |

Your plan determines which tiers you can access:

- Free & Starter: Standard only
- Pro: Standard + Premium
- Studio & above: All tiers including Ultra

## Default model

You can set a default model in **Settings → Models → Default Model**. This model is used when Auto mode selects a standard-tier model, replacing it with your preference.

## Disabling models

Disable specific models to prevent them from being used, even by Auto routing. Go to **Settings → Models** and toggle the models you don't want.

## Recommended model per task

| Task | Recommended |
|------|-------------|
| Simple UI edits | Claude Haiku / Gemini Flash |
| Feature development | Claude Sonnet / GPT-5.4 |
| Full app generation | Claude Opus / GPT-5.5 |
| Large codebase analysis | Gemini Pro (2M context) |
| Code refactoring | Composer (Cursor) |
`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDoc(slug: string): DocArticle | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function getDocsByCategory(): Record<string, DocArticle[]> {
  const map: Record<string, DocArticle[]> = {};
  for (const doc of DOCS) {
    if (!map[doc.category]) map[doc.category] = [];
    map[doc.category].push(doc);
  }
  return map;
}
