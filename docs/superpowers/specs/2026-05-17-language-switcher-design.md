# Login-Page UI Language Switcher Design

Date: 2026-05-17
Status: Draft for review
Scope: Browser-local UI language selection for zh/en web pages, with the switcher shown only on the login page

## Goal

Add a lightweight UI language switcher so a user can choose Chinese or English on the login page and have that choice persist for the same browser across the login page and the authenticated admin UI.

This feature is intentionally limited to the web UI:
- supported UI locales remain `zh` and `en`
- the language choice is stored only in the browser
- the existing notification-language setting remains independent

## Problem Statement

The project already has a shared browser-side localisation foundation:
- `src/core/locale.js` contains `UI_MESSAGES` and locale normalization
- `src/views/browser-locale-resources.js` injects `window.AppLocale`
- login, dashboard, admin, and config pages call `applyTranslations()`, `applyDocumentMetadata()`, and `getRequestHeaders()`

However, the current locale source is browser auto-detection only. Users cannot manually override the UI language. If the browser language is not what they want, every page continues to render in that automatically chosen locale.

We want a small override mechanism without turning UI language into a global server-side setting.

## User-Approved Product Decisions

1. The language selection is **per browser**, not global system config.
2. The visible switcher appears **only on the login page**.
3. After a choice is made on the login page, the authenticated pages should continue using that chosen locale.
4. Authenticated pages should **not** expose another language switcher entry.
5. The feature affects **UI text only** and does **not** change `NOTIFICATION_LOCALE` or any outbound notification language.

## Design Principles

1. **Reuse the existing localisation stack**
   - Keep `UI_MESSAGES`, `normalizeUiLocale()`, `getMessage()`, `applyTranslations()`, and `getRequestHeaders()` as the single localization path.
   - Do not create a second page-specific translation mechanism.

2. **Persist locally, not server-side**
   - Store the UI locale in browser storage only.
   - Do not add a config field, KV field, cookie contract, or API endpoint for UI locale.

3. **Login owns selection; app honors it**
   - The login page is the only place where users can change the UI locale.
   - All pages continue to resolve locale through the shared helper so they inherit the saved preference automatically.

4. **Browser detection remains the fallback**
   - Manual selection overrides browser language only when present.
   - If no saved choice exists, current browser-based behavior stays intact.

5. **Keep notification language independent**
   - Existing config-driven notification localization remains untouched.

## Recommended Approach

Extend the shared `window.AppLocale` runtime to support a browser-stored locale override, then add a compact zh/en switcher to `loginPage.html`.

This keeps the implementation centered in one shared locale helper and minimizes page-specific changes:
- login page gets the visible switcher and immediate re-translation behavior
- admin/dashboard/config inherit the chosen locale automatically because they already read from `window.AppLocale.getPreferredLocale()`
- API request localization via `X-Locale` follows the same chosen locale automatically

## Architecture

### 1. Shared browser locale override

Add a dedicated browser storage key for the UI locale, for example:

```text
uiLocale
```

Supported stored values:
- `zh`
- `en`

Any other stored value is treated as invalid and ignored.

### 2. Locale resolution order

Update the browser-side locale resolution flow used by `window.AppLocale.getPreferredLocale()`:

1. read the stored `uiLocale`
2. if it normalizes to `zh` or `en`, use it
3. otherwise fall back to existing browser detection:
   - `navigator.languages[0]`
   - then `navigator.language`
4. normalize unsupported languages to the default UI locale

This preserves current behavior for users who never touch the switcher.

### 3. Shared AppLocale API additions

Extend `src/views/browser-locale-resources.js` with helper methods such as:
- `getStoredLocale()`
- `setStoredLocale(locale)`
- `clearStoredLocale()` or equivalent invalid-value cleanup

Exact method names can vary, but the runtime should expose enough functionality for the login page to:
- read the current explicit override if any
- save a new override
- re-run document metadata and text translation immediately

The shared helper remains the only source of truth for:
- current UI locale
- `X-Locale` request headers
- translated text lookup
- document metadata localization

### 4. Login page switcher

Add a small, unobtrusive language control to `src/views/loginPage.html`.

Expected UX:
- visible before authentication
- shows Chinese and English choices only
- selecting a language immediately:
  - stores the choice locally
  - updates `document.title` / `html lang`
  - updates visible translated strings on the current login page

Recommended form factor:
- compact inline toggle or segmented control near the top-right area of the login card
- labels may be short and explicit, e.g. `中文` and `EN`

The login page should continue to work without a full page reload after switching.

### 5. Dynamic login-state localization behavior

The login page already localizes runtime text such as:
- submit button loading text
- invalid-credentials message
- generic error message

After the switcher is added:
- new submissions should always use the locale currently resolved by `window.AppLocale.getPreferredLocale()`
- if the user changes language while an error message is visible, the page should re-render that visible error state in the newly selected locale where practical

At minimum, the page must ensure that:
- idle/static content is updated immediately
- the next login attempt uses the chosen locale consistently for both UI strings and `X-Locale`

### 6. Authenticated page behavior

No language switcher is added to:
- `src/views/adminPage.html`
- `src/views/dashboardPage.html`
- `src/views/configPage.html`

These pages should simply continue using the shared locale helper. Because they already call `getPreferredLocale()` and `getRequestHeaders()`, they should render and fetch in the saved locale without additional UX changes.

### 7. Server interaction

The feature does not require server-side persistence.

Server behavior remains:
- pages/local scripts send `X-Locale`
- request handlers use the locale for localized responses where already implemented

By changing the browser-side locale source, login and authenticated API requests automatically inherit the chosen locale.

## UI Content Requirements

Add message keys for the login-page switcher UI, for example:
- switcher label if needed
- Chinese option label
- English option label

The switcher itself should be localized by the same message catalog where that improves clarity, but short self-describing labels such as `中文` / `EN` are acceptable if they reduce redundancy.

## Data Flow

### First visit with no saved locale
1. User opens login page
2. `getPreferredLocale()` finds no valid stored override
3. Browser language is used
4. Login page renders in the browser-detected locale

### Manual selection on login page
1. User selects `中文` or `EN`
2. Login page stores `uiLocale`
3. Login page reapplies metadata and translations immediately
4. Subsequent login submission sends `X-Locale` using that saved locale

### After successful login
1. Browser navigates to `/admin`
2. Admin page resolves locale through shared helper
3. Shared helper reads stored `uiLocale`
4. Authenticated page renders in the saved locale

## Error Handling

- Missing storage access: fall back to browser language without breaking page rendering
- Invalid stored locale value: ignore it and fall back to browser detection
- Unknown locale input passed into setter: normalize and reject/ignore unsupported values
- Translation refresh failure on switch: do not block interaction; keep the page usable and surface the chosen locale on the next render path

The locale override mechanism must never make login unavailable.

## Testing Strategy

### Shared locale runtime tests

Extend locale/browser runtime coverage to verify:
- stored `uiLocale=zh` overrides browser English
- stored `uiLocale=en` overrides browser Chinese
- invalid stored locale falls back to browser detection
- unsupported browser locales still fall back according to current normalization rules

### Login page regression tests

Add coverage that verifies:
- `loginPage.html` contains the language switcher markup
- the login page writes the selected locale to browser storage
- the login page re-applies document metadata/translations after switching
- login submission continues using `window.AppLocale.getRequestHeaders(...)`

### Existing UI-page regression tests

Confirm admin/dashboard/config still rely on the shared locale path instead of page-local locale logic. No new switcher should appear in those pages.

### Non-goals for testing in this phase

Do not change tests for:
- notification locale persistence
- email / Discord / scheduler notification copy
- server-side config schema for locale storage

## Scope

### In scope
- browser-local persisted UI locale override
- login-page zh/en switcher
- shared locale runtime update to honor stored override
- login page immediate translation refresh
- authenticated pages inheriting the saved locale automatically
- regression tests for runtime and views

### Out of scope
- authenticated-page language menu
- server-side UI locale storage
- cookies/session-based locale persistence
- any change to `NOTIFICATION_LOCALE`
- adding languages beyond `zh` and `en`

## Risks and Mitigations

### Risk: confusing UI locale with notification locale
Users may assume the login-page switcher also changes outgoing notification language.

**Mitigation:** keep the switcher off the config page and leave notification-language wording/config untouched.

### Risk: stale cached locale assumptions inside page scripts
Some scripts may cache locale values too early and fail to reflect the saved override consistently.

**Mitigation:** keep locale resolution in shared helper calls and avoid page-local hardcoded browser-language reads.

### Risk: login page switch changes visible text but misses runtime state
An existing error message or loading label could remain in the previous language.

**Mitigation:** explicitly re-run metadata/translation hooks and keep dynamic text derivation tied to the current resolved locale on each action.

## Rollout Plan

### Phase 1
- add stored UI locale support to shared browser locale runtime
- add login-page switcher and immediate retranslation
- add/adjust tests

### Phase 2
- only if later requested, consider exposing the same switcher inside authenticated pages

## Decision Summary

Chosen strategy:
- store UI locale locally in the browser
- show the switcher only on the login page
- let login, admin, dashboard, and config all read the same shared locale resolver
- keep browser language as the fallback when no explicit choice exists
- keep notification language fully separate
