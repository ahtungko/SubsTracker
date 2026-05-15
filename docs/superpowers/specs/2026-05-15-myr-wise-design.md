# MYR Default + Wise Rates Design

## Goal

Switch the system's aggregate/reporting base currency from CNY to MYR, add full MYR support across the app, and replace the current Frankfurter-based exchange-rate fetch with Wise Sandbox V2 using an env-only token.

## Current State

- Currency conversion currently lives in `src/core/currency.js`.
- The app currently uses `https://api.frankfurter.dev/v1/latest?base=CNY`.
- Fallback rates are hardcoded with CNY as the base currency.
- Dashboard labels and several UI maps still explicitly reference CNY.
- New and missing currency values commonly default to CNY.
- The user wants:
  - full MYR support
  - MYR as the new default everywhere
  - aggregate/reporting base switched to MYR
  - only missing/empty existing currency values to backfill to MYR
  - explicit existing CNY records preserved
  - Wise token stored in env only, not config UI

## Recommended Approach

Make a focused, end-to-end change with minimal scope:

1. Replace Frankfurter fetch logic with Wise Sandbox V2 rate fetching.
2. Change the system base from CNY to MYR.
3. Add MYR (`RM`) to all relevant currency symbol lists and UI selectors.
4. Make MYR the default for new subscriptions and payments.
5. Normalize missing/empty stored currency values to MYR at read/write paths.
6. Keep explicit existing CNY values unchanged.

This preserves the current architecture while making MYR the first-class base currency.

## Scope

### In scope

- Wise Sandbox V2 integration for exchange-rate lookups
- Env-only token usage via `WISE_SANDBOX_TOKEN`
- MYR support in backend conversion logic
- MYR support in UI currency lists and symbol maps
- MYR defaults for new subscriptions/payment history
- Missing/empty currency normalization to MYR
- Dashboard and text labels updated from CNY-based wording to MYR-based wording

### Out of scope

- Config-page support for Wise tokens
- Migrating explicit existing `CNY` records to `MYR`
- Broad refactors like centralizing all currency maps into a shared module
- One-off KV migration scripts

## Architecture

### 1. Exchange-rate source

Replace the current live-rate fetch in `src/core/currency.js`:

- Old: Frankfurter with `base=CNY`
- New: Wise Sandbox V2 endpoint:
  - `GET https://api.wise-sandbox.com/v1/rates?source=<SRC>&target=<TGT>`
  - `Authorization: Bearer <WISE_SANDBOX_TOKEN>`

Because Wise returns pairwise rates instead of a full base-currency matrix in one payload, the rate-loading code should explicitly fetch the currencies the app supports against MYR and then build a cached internal rate map.

### 2. System base currency

Switch the internal reporting base from CNY to MYR:

- fallback rates become MYR-based
- conversion helper changes from CNY semantics to MYR semantics
- dashboard aggregates and ranking totals become MYR-normalized
- dashboard labels/text should say MYR instead of CNY

### 3. Data/default behavior

For creation/update flows:

- new subscriptions default to `MYR`
- new payment history entries default to `MYR`
- if a currency field is missing or empty, normalize it to `MYR`
- if a stored currency is explicitly `CNY`, leave it as `CNY`

This avoids corrupting intentional historical CNY records while still adopting MYR going forward.

### 4. UI behavior

Update all user-facing currency selectors/maps used in admin/dashboard/notification display:

- add `MYR`
- use symbol `RM`
- make MYR the default selected option
- update dashboard/UI text that currently references CNY to MYR equivalents

## Data Flow

### Rate fetch flow

1. Backend requests Wise Sandbox V2 for supported source currencies against target MYR.
2. Results are transformed into the app's cached rate structure.
3. KV cache remains the first read path to reduce API calls.
4. If Wise fails or token is missing, fallback MYR-based rates are used.

### Subscription/payment flow

1. User creates or updates a subscription/payment.
2. If currency is missing/empty, app stores `MYR`.
3. Explicit provided currencies remain unchanged.
4. Aggregation logic converts values to MYR for reporting.

## Files Expected to Change

- `src/core/currency.js`
- `src/data/subscriptions.js`
- `src/api/handlers/subscriptions.js`
- `src/services/notify/reminder.js`
- `src/views/adminPage.html`
- `src/views/dashboardPage.html`

Potentially only if necessary for documentation/reference:
- `README.md`
- `wrangler.toml` (should be avoided if the user's local change would be disturbed)

## Error Handling

- If `WISE_SANDBOX_TOKEN` is missing, log clearly and fall back to MYR fallback rates.
- If Wise rate fetch partially fails, merge successful results with fallback rates.
- If an unsupported or missing currency is encountered, normalize missing/empty values to MYR and preserve unknown explicit values without crashing aggregation.

## Testing Strategy

Add regression coverage for:

1. MYR fallback/default handling in data paths
2. MYR-based conversion helper behavior
3. Wise-response transformation into internal rates
4. UI presence of `MYR (RM)` and MYR default selection
5. Dashboard text updated from CNY wording to MYR wording

## Risks

1. Currency symbol/default logic is duplicated across several files, so partial updates could leave inconsistent UI behavior.
2. Switching the aggregate base from CNY to MYR changes dashboard semantics and labels simultaneously, so tests must lock this down.
3. Wise returns pairwise rates, which is a different integration model from the current Frankfurter response shape.
4. The user has a local `wrangler.toml` modification, so that file should not be touched casually.

## Success Criteria

- MYR is selectable and displayed everywhere relevant.
- MYR is the default for new subscriptions and payments.
- Missing/empty existing currency values are treated/stored as MYR.
- Explicit existing CNY values remain unchanged.
- Dashboard/reporting aggregates are normalized to MYR.
- Frankfurter is no longer used; Wise Sandbox V2 is used instead.
- `WISE_SANDBOX_TOKEN` remains env-only.
- Changes avoid disturbing the user's unrelated `wrangler.toml` edit.

