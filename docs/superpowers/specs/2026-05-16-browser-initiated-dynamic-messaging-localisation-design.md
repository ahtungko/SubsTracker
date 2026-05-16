# Browser-Initiated Dynamic Messaging Localisation Design

Date: 2026-05-16
Status: Draft for review
Scope: zh/en localisation for dynamic front-end UI messages and browser-initiated API `message` responses

## Goal

Eliminate the remaining localisation gaps in browser-driven user flows by localising:
- front-end dynamic UI messages
- API `message` responses returned to browser-triggered requests
- the locale propagation path from browser -> API handler -> response

Supported UI locales remain:
- Chinese (`zh-*` => `zh`)
- English (`en-*` => `en`)
- Any other locale falls back to English

## Problem Statement

The project now localises:
- static body labels
- browser tab titles
- `html lang`
- selected accessibility attributes
- login-page static and limited dynamic strings

But many browser-triggered interactions still leak Chinese because dynamic messages are split across two places:

1. **Front-end hardcoded dynamic strings**
   - loading states
   - success/failure toasts
   - confirm prompts
   - button in-progress labels

2. **Backend API `message` strings**
   - JSON responses from `/api/*` handlers still often return Chinese-only `message` fields
   - the frontend frequently displays `result.message` directly

Without a shared browser-to-server locale flow, the UI will continue to have “half-localized” behavior.

## Design Principles

1. **Single locale model across browser and API**
   - The browser decides the locale for browser-triggered interactions.
   - API handlers use that locale when building response messages.

2. **Frontend owns local rendering; backend owns backend messages**
   - Frontend-local only strings should use `window.AppLocale.getMessage()`.
   - API response `message` values should come from server-side locale lookup, not remain hardcoded in page scripts.

3. **Do not mix browser locale with background-notification locale yet**
   - This phase only covers requests initiated by a browser session.
   - Background jobs and out-of-browser notifications need persisted user language and remain a later phase.

4. **Prefer shared helpers over per-handler custom logic**
   - Locale extraction and message lookup should be centralized.
   - Do not hand-roll locale handling in every handler.

## Recommended Approach

Introduce a shared locale propagation path for browser-originated requests:
- browser sends resolved locale on API requests
- server normalizes that locale with the same zh/en + English fallback rules
- API handlers build `message` strings from a shared backend message catalog
- frontend uses localized backend `message` when it is a true backend response string, and uses localized frontend `getMessage()` for purely local UI states

This keeps responsibilities clean and prevents duplicate localization logic.

## Architecture

### 1. Browser-to-server locale propagation

Add a shared browser helper to produce request headers for API calls, for example through `window.AppLocale`.

Conceptually:

```js
window.AppLocale.getRequestHeaders()
```

That helper should include a normalized locale header such as:

```txt
X-Locale: zh
```
or
```txt
X-Locale: en
```

Then browser `fetch('/api/...')` calls should include that header for browser-triggered requests.

This should be rolled out incrementally to the admin, config, dashboard, and login pages where dynamic requests already exist.

### 2. Shared server locale utilities

Create or extend a shared server-side locale module that can:
- normalize incoming locale values to `zh` / `en`
- read locale from request headers
- return localized backend messages from one message catalog

Suggested responsibilities:
- `normalizeUiLocale(rawLocale)`
- `extractRequestLocale(request)`
- `getServerMessage(key, locale)`

Frontend and backend may share key names where practical, but the design should not force total coupling if response-message wording needs to differ from UI wording.

### 3. Backend response message catalog

Add a backend-facing message dictionary for browser-triggered API responses.

This should cover recurring response types such as:
- unauthorized
- not found
- invalid request / missing parameter
- save success / save failure
- test notification success / failure
- subscription add/update/delete/toggle outcomes
- login invalid credentials if the frontend still needs to render server-provided auth errors in some flows

The goal is to replace hardcoded Chinese `message` strings in handlers like:
- `src/api/router.js`
- `src/api/handlers/auth.js`
- `src/api/handlers/config.js`
- `src/api/handlers/dashboard.js`
- `src/api/handlers/notify.js`
- `src/api/handlers/subscriptions.js`
- `src/api/handlers/test-notification.js`

### 4. Front-end dynamic message categories

Split dynamic messages into two categories:

#### A. Purely local UI-state strings
Examples:
- 保存中 / 删除中 / 测试中 / 发送中 / 加载中
- confirm prompts
- locally generated fallback text

These should stay in the frontend and use `window.AppLocale.getMessage()`.

#### B. API result messages
Examples:
- `result.message` from save/test/delete/toggle endpoints
- authorization errors
- missing parameter errors

These should come localized from the backend, and the frontend should display them as-is where appropriate.

### 5. Scope boundary for this phase

This phase covers **browser-triggered** flows only.

In scope examples:
- login form submit
- admin CRUD actions
- config save/test actions
- dashboard data fetch error messages shown in the browser
- browser-triggered test notifications

Out of scope examples:
- cron-triggered reminders
- scheduled background jobs
- email / Discord / reminder language preference for out-of-browser delivery

Those need persisted language preference and are a separate design problem.

## Recommended Rollout Order

### Phase 1: Server locale backbone
- add request-locale extraction
- add shared backend message catalog
- localize a first set of core API handlers with many reused messages

### Phase 2: Front-end request/header adoption
- add browser header helper
- update browser fetch calls to send locale

### Phase 3: Front-end dynamic UI strings
- replace hardcoded dynamic page strings with `window.AppLocale.getMessage()`
- remove remaining hardcoded zh-only local status text where applicable

### Phase 4: Gap cleanup
- audit browser-triggered flows for any remaining direct Chinese strings in success/failure/confirm/loading paths

## Testing Strategy

### Unit tests
Add coverage for:
- locale extraction from request headers
- backend message lookup in zh and en
- English fallback for unsupported locales

### Browser runtime tests
Add coverage for:
- request-header helper returns normalized locale header
- frontend dynamic messages use `getMessage()` for local-only strings

### Handler-level regression tests
Add or extend tests verifying:
- localized `message` output for key API handlers under `zh` and `en`
- unsupported locales fall back to English
- browser-triggered login/config/subscription/test-notification flows return localized messages

### Page-level regression tests
Where practical, extend existing view tests to ensure:
- targeted button loading labels are no longer hardcoded Chinese
- login/admin/config/dashboard fetch paths include locale propagation

## Scope

### In scope
- browser-triggered dynamic UI strings
- browser-triggered API `message` localization
- locale propagation from browser to API
- shared backend locale message utilities

### Out of scope
- persisted language preference
- background-job / cron-triggered notification localisation
- email / Discord / reminder language for out-of-browser delivery
- full arbitrary server-side translation framework

## Risks and Mitigations

### Risk: duplicated message catalogs
Frontend and backend may both need similar strings.

**Mitigation:** share key naming conventions and keep small, focused catalogs. Only split wording when responsibilities genuinely differ.

### Risk: partial rollout creates mixed-language flows
If only some fetch calls carry locale headers, some handlers will localize while others stay Chinese.

**Mitigation:** implement locale propagation systematically for each touched browser page and add regression coverage.

### Risk: trying to solve background notifications too early
That requires persisted language preference and is a larger product decision.

**Mitigation:** explicitly defer background/out-of-browser delivery until a later phase.

## Decision Summary

Chosen strategy:
- browser sends locale on API requests
- backend normalizes locale and returns localized `message` fields
- frontend local-only dynamic strings use `window.AppLocale.getMessage()`
- this phase covers browser-triggered flows only
- background notification localisation is deferred to a later, preference-based phase

## User Preference

Do not commit this design document automatically. Leave it uncommitted for manual user review and commit.
