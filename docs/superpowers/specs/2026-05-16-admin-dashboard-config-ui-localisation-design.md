# Admin/Dashboard/Config UI Localisation Design

Date: 2026-05-16
Status: Draft for review
Scope: First-wave zh/en browser-locale UI localisation for admin, dashboard, and config pages

## Goal

Extend the existing timezone-only browser locale foundation into a lightweight general UI localisation system for the web interface.

First-wave target pages:
- `src/views/adminPage.html`
- `src/views/dashboardPage.html`
- `src/views/configPage.html`

Supported UI locales:
- Chinese (`zh-*` => `zh`)
- English (`en-*` => `en`)
- Any other locale falls back to English

This phase does not localise login, toast/alert/confirm flows, or server-generated notification content.

## Problem Statement

The project now has a shared browser locale runtime for timezone labels, but general UI text is still hardcoded directly inside large inline HTML templates. If we continue adding localisation ad hoc, the same problems will reappear:
- duplicated translation logic across pages
- inconsistent fallback behavior
- poor maintainability for future UI text changes
- no shared way to localise static labels outside timezone display

We need a minimal system that fits the existing inline-template architecture without introducing a heavy i18n framework.

## Design Principles

1. **Keep browser-locale resolution centralized**
   - Continue using the existing locale normalization rules:
     - `zh-*` => `zh`
     - `en-*` => `en`
     - anything else => `en`

2. **Keep canonical data separate from display language**
   - Timezone IDs and other stored values remain unchanged.
   - Localisation affects UI labels only.

3. **Match the current codebase shape**
   - The app uses inline HTML templates and injected shared browser scripts.
   - The solution should build on `window.AppLocale`, not introduce a framework dependency.

4. **Prefer declarative markup for static text**
   - Static UI strings should be marked in HTML, then translated by a shared runtime.
   - This is more maintainable than scattering manual `textContent = ...` assignments across page scripts.

5. **Keep phase 1 intentionally narrow**
   - First wave targets static UI text on admin/dashboard/config only.
   - Dynamic notifications and login stay out of scope for now.

## Recommended Approach

Adopt a lightweight `data-i18n` pattern on top of the existing `window.AppLocale` runtime:
- add a shared UI message catalog to `src/core/locale.js`
- expose `getMessage()` and `applyTranslations()` from `window.AppLocale`
- annotate static UI elements with translation keys using `data-i18n`
- run one shared translation pass after each page loads

This gives us a small, explicit, low-risk localisation layer that is easy to apply incrementally.

## Architecture

### 1. Shared UI message catalog

Expand `src/core/locale.js` beyond timezone labels so it also exports a general message dictionary.

Proposed shape:

```js
const UI_MESSAGES = {
  zh: {
    nav_dashboard: '仪表盘',
    nav_subscriptions: '订阅管理',
    nav_settings: '系统设置',
    btn_save: '保存设置'
  },
  en: {
    nav_dashboard: 'Dashboard',
    nav_subscriptions: 'Subscriptions',
    nav_settings: 'Settings',
    btn_save: 'Save'
  }
};
```

Also add a shared lookup helper:

```js
getMessage(key, locale = DEFAULT_UI_LOCALE)
```

Fallback behavior:
1. target locale value
2. English value
3. key itself

Returning the key as the last fallback is intentional: it makes missing translations visible during development without breaking the UI.

### 2. Browser runtime expansion

Extend `src/views/browser-locale-resources.js` so `window.AppLocale` becomes a general UI-localisation surface, not just a timezone helper.

Target API for this phase:

```js
window.AppLocale = {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  normalizeUiLocale,
  getPreferredLocale,
  getTimezoneDisplayName,
  formatTimezoneDisplay,
  getMessage,
  applyTranslations
}
```

`applyTranslations(root = document)` should:
- find elements with `data-i18n`
- read the key from `data-i18n`
- replace `textContent` using `getMessage(key)`

Phase-1 scope for `applyTranslations()` is intentionally limited to `textContent` replacement only.

We should not add placeholder/title/ARIA localization in this first wave unless the implementation is trivial and directly required by the chosen UI strings.

### 3. Markup strategy

Static UI content should move to declarative translation markers.

Example:

```html
<h1 data-i18n="nav_dashboard">仪表盘</h1>
<button data-i18n="btn_save">保存设置</button>
```

The Chinese source text may remain in the HTML as the human-readable fallback during editing, but runtime translation should always come from `window.AppLocale`.

This approach is preferred over page-specific JavaScript assignments because:
- it keeps translation intent next to the markup
- it reduces script noise in already-large inline page files
- it makes translation coverage easier to review

### 4. Page initialization

Each first-wave page should call:

```js
window.AppLocale.applyTranslations();
```

This should happen early enough that visible static labels are translated before or immediately as the UI becomes interactive, but without disrupting existing page initialization order.

Pages in scope:
- `adminPage.html`
- `dashboardPage.html`
- `configPage.html`

The existing timezone localisation stays in place and continues to use `window.AppLocale.formatTimezoneDisplay(...)`.

### 5. First-wave translation scope

Translate static, high-value UI text only.

Included in first wave:
- navbar links
- page titles
- section headings
- primary button text
- form labels
- short static helper text

Explicitly excluded from first wave:
- login page
- toast messages
- confirm/alert text
- backend-generated messages
- email / Discord / reminder content
- large descriptive paragraphs unless already being touched for nearby UI work

This keeps the phase focused and lowers regression risk.

## Testing Strategy

### Unit-level tests

Add coverage for:
- `getMessage()` returning Chinese values for `zh-*`
- `getMessage()` returning English values for `en-*`
- unsupported locales falling back to English
- unknown keys falling back to the key itself

### Page-level regression tests

Add or extend tests to verify:
- the shared browser runtime exposes `getMessage()` and `applyTranslations()`
- first-wave pages contain `data-i18n` markers for targeted static UI text
- first-wave pages call `window.AppLocale.applyTranslations()`
- inline scripts still compile after localisation changes

### Non-goals for testing in this phase

Do not add notification-localisation tests yet for:
- login page
- toast / confirm / alert copy
- email / Discord / reminder text

Those areas need a broader localisation decision and are intentionally deferred.

## File Impact

Likely files for implementation:
- `src/core/locale.js`
- `src/views/browser-locale-resources.js`
- `src/views/adminPage.html`
- `src/views/dashboardPage.html`
- `src/views/configPage.html`
- new or updated tests under `tests/core/` and `tests/views/`

No framework adoption, routing changes, or server API changes are required.

## Risks and Mitigations

### Risk: overly broad first wave
If we try to translate all strings at once, the large inline templates become harder to review and regressions become more likely.

**Mitigation:** keep first wave limited to high-value static labels.

### Risk: duplicated translation logic creeps back in
Developers may continue adding hardcoded language branches in page scripts.

**Mitigation:** make `window.AppLocale.getMessage()` and `data-i18n` the standard pattern for static UI text.

### Risk: later dynamic text needs a different approach
Static labels are easy; dynamic messages and backend notifications are not.

**Mitigation:** explicitly separate this first wave from later dynamic/server-side localisation work.

## Rollout Plan

### Phase 1
- Add shared UI message catalog and `getMessage()`
- Add `applyTranslations()` to browser runtime
- Localise static UI text on admin/dashboard/config

### Phase 2
- Add login page localisation
- Add placeholder/title/attribute localisation if needed
- Add toast/confirm/alert localisation strategy

### Phase 3
- Decide whether to introduce persisted user language preference for out-of-browser channels such as email and Discord

## Decision Summary

Chosen strategy:
- reuse the existing `window.AppLocale` foundation
- add a shared `UI_MESSAGES` dictionary and `getMessage()` helper
- use `data-i18n` for first-wave static UI text
- add `applyTranslations()` for one-pass page translation
- localise admin/dashboard/config first
- defer login, toast, and notification localisation to later phases

## User Preference

Do not commit this design document automatically. Leave it uncommitted for manual user review and commit.
