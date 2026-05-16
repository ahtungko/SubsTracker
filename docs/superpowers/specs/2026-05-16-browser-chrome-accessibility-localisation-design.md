# Browser Chrome and Accessibility Localisation Design

Date: 2026-05-16
Status: Draft for review
Scope: Second-wave browser-locale localisation for page titles, language metadata, and selected accessibility attributes on admin, dashboard, and config pages

## Goal

Extend the first-wave admin/dashboard/config UI localisation so browser-visible and accessibility-facing page chrome also follows the user's browser locale.

Pages in scope:
- `src/views/dashboardPage.html`
- `src/views/adminPage.html`
- `src/views/configPage.html`

Supported UI locales remain:
- Chinese (`zh-*` => `zh`)
- English (`en-*` => `en`)
- Any other locale falls back to English

## Problem Statement

The first wave localized visible static body text with `data-i18n` and `window.AppLocale.applyTranslations()`. However, several browser- and accessibility-facing strings remain Chinese-only:
- `<title>` text in the browser tab
- `html lang` metadata
- at least one mobile-menu `aria-label`
- potentially a small set of safe attribute-level strings such as `title` or placeholder text in tightly scoped cases

This leaves the UI partially localized: the page body can switch language, but browser chrome and assistive text may not.

## Design Principles

1. **Reuse the current localisation foundation**
   - Keep using `UI_MESSAGES`, `getMessage()`, and browser-locale detection via `window.AppLocale`.

2. **Add attribute-level localisation only where needed**
   - Do not broaden into a general attribute templating system for every case.
   - Implement the smallest extension needed for titles, `lang`, and selected accessibility attributes.

3. **Keep the phase narrow**
   - This phase is about browser chrome and accessibility metadata for the three already-localized pages.
   - Login, toast/confirm/alert, and notification channels remain out of scope.

4. **Prefer explicit declarative markers over page-specific JS**
   - Titles and attributes should be localizable through shared runtime hooks, not repeated per-page custom logic.

## Recommended Approach

Extend `window.AppLocale.applyTranslations()` so it can handle a small, explicit set of attribute-level localisation markers in addition to text nodes.

Recommended supported markers for this phase:
- `data-i18n` -> replace `textContent`
- `data-i18n-aria-label` -> replace `aria-label`
- `data-i18n-title` -> replace `title`

For page titles and document language metadata, add dedicated helpers:
- `window.AppLocale.applyDocumentMetadata()`
- `window.AppLocale.getDocumentLang()` or equivalent internal logic

This avoids overloading `data-i18n` for document-wide concerns while still keeping everything in the shared browser runtime.

## Architecture

### 1. Message catalog expansion

Add new keys for browser tab titles and accessibility labels.

Proposed additions:

```js
UI_MESSAGES = {
  zh: {
    page_title_dashboard: '仪表盘 - SubsTracker',
    page_title_admin: '订阅管理系统',
    page_title_config: '系统配置 - 订阅管理系统',
    aria_toggle_navigation_menu: '切换导航菜单'
  },
  en: {
    page_title_dashboard: 'Dashboard - SubsTracker',
    page_title_admin: 'Subscription Manager',
    page_title_config: 'Settings - Subscription Manager',
    aria_toggle_navigation_menu: 'Toggle navigation menu'
  }
}
```

The exact English copy should stay short and browser-friendly.

### 2. Runtime responsibilities

Extend the browser runtime with two additional concerns:

#### A. Attribute-level translation support

`applyTranslations(root = document)` should continue translating text nodes via `data-i18n`, and also support:
- `data-i18n-aria-label`
- `data-i18n-title`

Behavior:
- resolve locale once
- for each supported attribute marker, look up the translation key using `getMessage()`
- set the corresponding attribute value

This remains intentionally narrow. We should not add generic arbitrary-attribute localisation in this phase.

#### B. Document metadata localisation

Add a helper such as:

```js
applyDocumentMetadata({ titleKey })
```

Behavior:
- set `document.title` from `getMessage(titleKey)`
- set `document.documentElement.lang` to:
  - `zh-CN` when resolved locale is `zh`
  - `en` when resolved locale is `en`

This keeps title and `lang` handling out of per-page bespoke scripts.

### 3. Page integration

Each in-scope page should call both:

```js
window.AppLocale.applyDocumentMetadata({ titleKey: '...' });
window.AppLocale.applyTranslations();
```

Use these title keys:
- dashboard -> `page_title_dashboard`
- admin -> `page_title_admin`
- config -> `page_title_config`

The calls should remain near the top of each page’s main script block, before the rest of page initialization.

### 4. Markup strategy for accessibility attributes

For the known mobile menu button, replace the hardcoded Chinese `aria-label` with a declarative marker.

Example:

```html
<button
  id="mobile-menu-btn"
  data-i18n-aria-label="aria_toggle_navigation_menu"
  aria-label="切换导航菜单"
>
```

The literal Chinese value may remain in markup as the source fallback during editing, but runtime should replace it based on locale.

If any safe, nearby `title` attributes are chosen in implementation, they should use:

```html
data-i18n-title="some_key"
```

But adding new title-key coverage beyond what is immediately present is optional for this phase.

## Testing Strategy

### Unit/runtime tests

Extend runtime-level tests to verify:
- `applyTranslations()` updates `aria-label` when `data-i18n-aria-label` is present
- `applyTranslations()` updates `title` when `data-i18n-title` is present
- `applyDocumentMetadata()` sets `document.title`
- `applyDocumentMetadata()` sets `document.documentElement.lang`
- unsupported locales still resolve to English metadata values

### Page-level regression tests

Add or extend tests to verify the three in-scope pages:
- reference the correct page-title key
- call `window.AppLocale.applyDocumentMetadata(...)`
- contain `data-i18n-aria-label="aria_toggle_navigation_menu"` on the mobile-menu button
- continue calling `window.AppLocale.applyTranslations()`
- still compile as inline scripts

## Scope

### In scope
- browser tab titles for dashboard/admin/config
- `html lang` metadata for dashboard/admin/config
- mobile-menu `aria-label` localisation for dashboard/admin/config
- narrow runtime support for `data-i18n-aria-label` and `data-i18n-title`

### Out of scope
- login page localisation
- placeholder localisation in general
- toast / confirm / alert localisation
- backend-generated notification text
- arbitrary attribute translation framework
- persisted user language preference

## Risks and Mitigations

### Risk: overextending attribute support too early
A broad arbitrary-attribute system would add complexity before it is justified.

**Mitigation:** only support `aria-label` and `title` in this phase.

### Risk: page scripts become order-dependent
If title/lang application happens too late, browser-visible text may briefly show the fallback language.

**Mitigation:** run metadata localisation near the start of each page’s main script block.

### Risk: metadata and body text diverge
If titles use separate logic from body translation, they may drift over time.

**Mitigation:** keep all title and attribute copy in the same `UI_MESSAGES` dictionary.

## Rollout Plan

### Phase 2A
- Add title and accessibility keys to `UI_MESSAGES`
- Extend browser runtime with attribute translation and document metadata helpers
- Update dashboard/admin/config titles, `lang`, and mobile-menu `aria-label`

### Phase 2B
- Consider placeholder/title coverage for additional safe fields if needed
- Move on to `loginPage.html`

## Decision Summary

Chosen strategy:
- reuse the current `AppLocale` and `UI_MESSAGES` foundation
- add narrow support for `aria-label` and `title` translation markers
- add shared document-metadata localisation for page title and `html lang`
- apply this only to dashboard/admin/config in this phase

## User Preference

Do not commit this design document automatically. Leave it uncommitted for manual user review and commit.
