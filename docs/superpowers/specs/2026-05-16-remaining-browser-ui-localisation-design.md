# Remaining Browser UI Localisation Design

Date: 2026-05-16
Status: Draft for review
Scope: Finish zh/en browser-visible UI localisation for admin, dashboard, config, and login pages

## Goal

Complete the remaining browser-visible localisation work so the web UI consistently follows the existing zh/en browser-locale system.

Pages in scope:
- `src/views/adminPage.html`
- `src/views/dashboardPage.html`
- `src/views/configPage.html`
- `src/views/loginPage.html` (regression check only unless new gaps are found)

Supported UI locales:
- Chinese (`zh-*` => `zh`)
- English (`en-*` => `en`)
- Any other locale falls back to English

This phase covers browser-visible text only.

Explicitly out of scope:
- source-code comments
- `console.log` / `console.error` text
- backend logs
- non-browser notification content already handled by the notification-locale flow

## Problem Statement

The project already has:
- shared browser locale detection
- shared `window.AppLocale` runtime helpers
- first-wave static `data-i18n` coverage
- partial second-wave dynamic localisation

But a substantial amount of browser-visible Chinese text still remains hardcoded in large inline page templates, especially in:
- admin filters, tables, modal flows, payment history, and renewal UI
- config form help text, notifier sections, secret-field status text, and runtime actions
- dashboard runtime-generated status and stats copy

The recent bug also showed a second problem: ad hoc scripted edits can introduce broken source text such as literal `\uXXXX` escape soup or `???` placeholders. The completion pass needs to eliminate the remaining localisation gaps while also making that class of regression easier to detect.

## Design Principles

1. **Finish the current system, do not replace it**
   - Reuse `src/core/locale.js` and `window.AppLocale`.
   - Do not introduce a new i18n framework or a second localisation pattern.

2. **Localise all browser-visible UI text**
   - Static markup text
   - Placeholder/title/ARIA text
   - Runtime toasts, confirms, labels, empty states, and status badges
   - Text embedded inside dynamic HTML string templates

3. **Keep comments and logs out of scope**
   - They are not user-facing.
   - Changing them now would enlarge review scope without improving browser UX.

4. **Prefer readable source text**
   - Source files should not contain new literal `\uXXXX` escape soup for normal UI strings.
   - Missing translations should be visible through tests, not hidden in encoded source.

5. **Minimise structural churn**
   - Large inline pages are already risky to edit.
   - Keep work focused on localisation coverage, not broad refactors.

## Recommended Approach

Use the existing `window.AppLocale.getMessage(...)` and declarative attribute markers to finish coverage in place:

- expand `UI_MESSAGES` with the remaining browser-visible keys
- continue using `data-i18n`, `data-i18n-placeholder`, and existing attribute-translation support for static markup
- replace remaining hardcoded runtime strings with `window.AppLocale.getMessage(...)`
- replace browser-visible text inside template-string HTML builders with locale keys as well
- add regression tests that check both behavior and source hygiene (`???` / literal `\uXXXX`)

This keeps the fix aligned with the current architecture and makes the remaining work reviewable page by page.

## Architecture

### 1. Shared locale catalog completion

`src/core/locale.js` remains the single source of truth for browser UI copy.

Add the remaining keys required for:
- admin filters and table chrome
- admin runtime validation / confirm / modal labels
- dashboard runtime stats / empty-state / status strings
- config secret-field state, notifier labels, token actions, and runtime progress text

The existing helper shape stays:

```js
getMessage(key, locale = DEFAULT_UI_LOCALE, params = {})
```

Interpolation remains the standard mechanism for runtime strings like:
- counts
- names in modal titles
- totals / summaries

### 2. Browser runtime remains the translation surface

`src/views/browser-locale-resources.js` continues to expose:
- locale normalization
- locale-tag helpers
- request-header helpers
- markup translation helpers
- `getMessage(...)`

No new runtime object should be added. Pages should continue calling into `window.AppLocale`.

### 3. Static markup strategy

For static browser-visible text:
- use `data-i18n` for text nodes
- use `data-i18n-placeholder` for placeholders
- keep existing title / aria attribute translation markers

This applies especially to:
- config labels and helper copy still hardcoded in HTML
- admin filter options / column labels still hardcoded in markup

### 4. Runtime string strategy

For browser-visible strings produced in JavaScript:
- replace direct Chinese literals with `window.AppLocale.getMessage(...)`
- keep one retrieval pattern throughout the page
- use interpolation instead of string concatenation where user-visible values are inserted

Examples in scope:
- admin validation errors
- admin confirm dialogs
- modal headings
- dynamic table badges / labels
- dashboard stat subtitles / empty states / runtime status copy
- config secret-status and token-generation messages

### 5. Dynamic HTML builders

Where page logic builds HTML strings directly, the embedded user-facing text must also come from locale keys.

This is especially important in `adminPage.html`, where a large amount of browser-visible copy is created inside template strings for:
- subscription rows
- payment history modal
- renewal modal
- status and reminder badges

We should not leave these builders partially localised; partial coverage will keep producing mixed-language UIs.

## Page-by-Page Scope

### Dashboard

Finish the remaining runtime strings for:
- stat card headings / subtitles
- expiring-soon copy
- scheduler empty and status text
- recent-payment and upcoming-renewal empty states
- any remaining date/time formatting that should follow locale tag selection

### Config

Finish:
- remaining static helper text and section labels
- notifier labels not yet on translation keys
- secret-status text
- token-generation and test-progress messages
- browser-visible fallback / warning text used during config load/save/test flows

### Admin

Finish:
- filter options and table headers
- validation copy
- empty/loading/error table states
- status / reminder / action labels in dynamic rows
- payment history modal headings and labels
- manual renewal modal headings and helper text
- confirm / toast / dynamic badge copy that is still browser-visible

### Login

Keep current localisation behavior intact and use regression tests to ensure this completion pass does not break it.

## Testing Strategy

### Unit tests

Extend locale-catalog coverage for newly added keys and interpolation behavior.

Add a source-hygiene assertion that the shared locale file does not reintroduce literal `\uXXXX` escape soup for standard zh strings.

### Page-level regression tests

Extend page tests to assert:
- remaining targeted browser-visible strings now use `AppLocale` or `data-i18n*`
- no new `???` placeholders remain in targeted runtime output
- no new literal `\uXXXX` source escapes remain in targeted page source where readable UI text is expected

### Full verification

Run:

```bash
npm test
```

Completion cannot be claimed without a fresh full-suite pass.

## Risks and Mitigations

### Risk: mixed-language UI persists

Because the admin and config pages are large, it is easy to miss user-facing strings hidden inside template builders.

**Mitigation:** page-specific regression tests should target known dynamic hotspots, not just top-level static markup.

### Risk: scripted edits reintroduce encoding artifacts

The recent `???` / `\uXXXX` issue showed that mechanical edits can silently corrupt source readability.

**Mitigation:** add explicit source-hygiene tests for these regressions.

### Risk: accidental scope creep into refactors

Large inline page scripts invite cleanup while editing.

**Mitigation:** stay focused on localisation coverage only; defer structural cleanup unless it directly unblocks localisation.

## File Impact

Expected implementation touch points:
- `src/core/locale.js`
- `src/views/browser-locale-resources.js`
- `src/views/adminPage.html`
- `src/views/dashboardPage.html`
- `src/views/configPage.html`
- `tests/core/locale.test.js`
- `tests/views/browser-ui-localisation.test.js`
- page-specific regression tests where needed

## Decision Summary

Chosen strategy:
- finish the existing browser locale system instead of replacing it
- localise every browser-visible UI string still hardcoded in admin/dashboard/config
- keep login as regression coverage unless new gaps are found
- exclude comments and logs from this phase
- add source-hygiene checks so literal `\uXXXX` and `???` regressions are caught automatically

## User Preference

Follow the existing repository preference for localisation work:
- do not commit this design document automatically
- leave it uncommitted for manual review and commit
