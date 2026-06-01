# Vodex rebranding — remaining checklist (dreamos86.com → vodex.dev)

Code in `src/`, `public/`, and `.env.example` is migrated. **Production still shows old copy until you deploy and update external services.**

## Vercel (Production environment)

| Variable | Set to |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://vodex.dev` |
| `NEXT_PUBLIC_SITE_URL` | `https://vodex.dev` |
| `SUPPORT_EMAIL` | `support@vodex.dev` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@vodex.dev` |
| `EMAIL_FROM` | `Vodex <support@vodex.dev>` |
| `RESEND_FROM_EMAIL` | `Vodex <support@vodex.dev>` |
| `PADDLE_CHECKOUT_URL` | `https://vodex.dev` |
| `ADMIN_OWNER_EMAIL` | Your owner inbox (optional; replaces legacy default) |

Redeploy after changing env vars.

## Supabase Auth

- **Site URL:** `https://vodex.dev`
- **Redirect URLs:** `https://vodex.dev/auth/callback`
- Custom auth domain (optional): `auth.vodex.dev` — update Google OAuth consent + `NEXT_PUBLIC_SUPABASE_URL`

## Paddle

- Webhook: `https://vodex.dev/api/webhooks/paddle`
- Approved checkout domain: `vodex.dev`
- Email enterprise sheet: `docs/paddle-enterprise-pricing-sheet.md` → sellers@paddle.com

## Resend / DNS

- Sending domain: `vodex.dev` (DKIM/SPF on `send` subdomain per Resend docs)
- Do not use `onboarding@resend.dev` in production

## DNS

- `vodex.dev` → Vercel production
- Optional: `dreamos86.com` → 301 redirect to `https://vodex.dev` (legacy only)

## Local `.env.local` (your machine)

Update comments/values if they still say dreamos86.com (secrets are not committed).

## Still legacy in repo (non–user-facing)

- `src/lib/brand/legacy-brand-allowlist.ts` — redirect host detection only
- `docs/DEPLOYMENT.md`, `docs/help/paddle-billing-setup.md` — update when convenient
- `tests/e2e/public-landing.spec.ts` — may still assert old marketing copy

## Verify after deploy

```bash
npm run verify:brand-migration
npm run verify:paddle-domain-review
```

Manually open: https://vodex.dev/terms, /refunds, /pricing — hard refresh (Ctrl+Shift+R).
