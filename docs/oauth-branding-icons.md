# OAuth and platform icon branding

DreamOS86 uses one **transparent cloud PNG** for in-app branding:

`/brand/dreamos86-icon.png?v=13`

User-generated **app icons** (`projects.icon_url`, `icon_svg`) are separate and must never be replaced with DreamOS86 branding.

## What each surface controls

| Surface | Who controls it | How to update |
|--------|------------------|---------------|
| Browser tab favicon | DreamOS86 app | `npm run icons:generate` (fill ~84%, transparent) |
| Login / signup / app UI | DreamOS86 app | `DreamOS86BrandIcon` / `DreamOS86BrandLockup` |
| **Google** OAuth chooser text & domain | **Supabase Auth** | Supabase Dashboard → custom auth domain (e.g. `auth.dreamos86.com`). See `docs/supabase-custom-auth-domain.md`. |
| **GitHub** OAuth “Sign in with …” logo | **GitHub OAuth App** | GitHub → Settings → Developer settings → OAuth Apps → your app → **Application logo** |

## GitHub OAuth logo (cube vs cloud)

Changing `favicon.ico`, `public/icon.png`, or Next.js metadata **does not** change the logo on GitHub’s OAuth consent screen.

GitHub caches the **Application logo** uploaded in the OAuth App settings. To show the new cloud icon:

1. Export a square PNG from `public/brand/dreamos86-icon.png` (512×512 recommended).
2. Open [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers).
3. Select the DreamOS86 OAuth App used by Supabase.
4. Upload the new image under **Application logo** → Update application.

## Google OAuth branding

Google may display your Supabase project hostname (e.g. `xxxx.supabase.co`) until you configure a **custom Supabase auth domain**. That is independent of favicon or in-app icon size.

## Deprecated assets (do not use)

- `public/logo.svg` — old cube/diamond vector mark
- `public/logo.png`, `public/dreamos86-platform-logo.png` — legacy; not used in UI
- Hardcoded `/icon.png` for DreamOS86 brand — use `DREAMOS86_BRAND_ICON_SRC` instead

## Regenerating favicons

```bash
npm run icons:generate
npm run icons:check
```

Favicon/tab icons use ~**84%** fill on a transparent canvas (no matte, no crop). UI brand icons use larger display sizes via React variants.
