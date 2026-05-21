# Credit billing verification checklist

Run after deploying or applying the Supabase repair patch.

## 1. Copy SQL fix

- [ ] Admin → **Copy SQL fix** copies executable SQL only (no markdown, no file paths).
- [ ] Toast: “SQL patch copied. Paste it into Supabase SQL Editor and run the entire file.”

## 2. Supabase SQL Editor

- [ ] Paste and run the **entire** `scripts/credit-billing-sql-patch.sql` output.
- [ ] Patch succeeds even when old `ensure_user_profile` returned `void` or old `charge_tokens` was `p_user_id`-first.
- [ ] Final verification query shows exactly two functions:
  - `charge_tokens` — `p_amount integer, p_conversation_id uuid, …, p_user_id uuid` → `jsonb`
  - `ensure_user_profile` — `p_user_id uuid, p_email text` → `jsonb`
- [ ] No extra `charge_tokens` overloads.

## 3. Admin Debug RPC JSON (`GET /api/admin/debug-credit-rpc`)

- [ ] `tables.profiles` = true
- [ ] `pgCatalog.charge_tokens_exists` = true
- [ ] `pgCatalog.charge_tokens_canonical` = true
- [ ] `postgrestTest.ok` = true (or `serviceRoleDryRun.executable` = true with `invalid_amount` in result)
- [ ] `serviceRoleDryRun.executable` = true
- [ ] `ok` = true
- [ ] No secrets in response (`serviceRolePresent` boolean only)

## 4. Reload schema

- [ ] **Reload schema** calls `dreamos_reload_pgrst_schema`, waits 2s, re-probes, returns updated `diagnosis`.

## 5. Runtime safety

- [ ] “test” in Build mode does **not** start a build.
- [ ] With billing broken: chat/preflight returns `charge_tokens_missing` and **does not** call the provider.
- [ ] Message: “Credit billing unavailable. AI generation is paused…”

## 6. Prompt dedupe

- [ ] Home → Create with one prompt → one user bubble, one workflow.
- [ ] Refresh Create does **not** resubmit the same prompt.
- [ ] Composer submit does not double-send (StrictMode / autostart).

## 7. Credits after fix

- [ ] Real build charges credits **after** success (`[credits] charge ok` in server logs).
- [ ] `ai_usage_logs`, `credit_events`, `token_ledger` receive rows.
- [ ] Admin AI usage shows non-zero credits when builds run.
- [ ] Idempotent `operation_id` does not double-charge.

## 8. Cost-first AI (unchanged)

- [ ] Staged build uses mini/flash for plan/validate; Sonnet only for hard implementation.
- [ ] Provider calls log model, operation, estimated cost; failures write `ai_usage_logs.status=failed`.
