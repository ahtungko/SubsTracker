# Login Page Localisation Design

Date: 2026-05-16
Status: Draft for review
Scope: zh/en browser-locale localisation for `src/views/loginPage.html`

## Goal

Extend the existing browser-locale localisation system so the login page also follows the user's browser language.

Supported UI locales remain:
- Chinese (`zh-*` => `zh`)
- English (`en-*` => `en`)
- Any other locale falls back to English

## Problem Statement

The admin, dashboard, and config pages now share a common localisation foundation for:
- visible static UI text
- browser tab titles
- `html lang`
- selected accessibility attributes

`loginPage.html` is still outside that system. This means users can arrive at an untranslated entry page even though the rest of the admin UI is localized.

We should bring login into the same shared `AppLocale` / `UI_MESSAGES` model before moving on to more dynamic or server-driven text.

## Design Principles

1. **Reuse the existing localisation stack**
   - Continue using `UI_MESSAGES`, `getMessage()`, `applyTranslations()`, and `applyDocumentMetadata()`.
   - Do not create login-specific localisation logic outside the shared runtime.

2. **Keep scope narrow**
   - This phase covers the login page only.
   - No toast/confirm/global dynamic-message refactor yet.

3. **Prefer declarative markup**
   - Static visible strings should use `data-i18n`.
   - Browser chrome/accessibility strings should use the same runtime pattern already established in admin/dashboard/config.

4. **Keep login self-contained**
   - The login page is a natural next step because it is a single entry page with relatively low integration risk.

## Recommended Approach

Apply the same pattern already used in the other pages:
- extend `UI_MESSAGES` with login-specific keys
- add `data-i18n` markers to login static text
- use `applyDocumentMetadata({ titleKey: 'page_title_login' })`
- localize any safe accessibility strings such as button/menu labels if present

This keeps login aligned with the rest of the application and avoids introducing a second localisation pattern.

## Architecture

### 1. Shared message catalog expansion

Add login-specific keys to `UI_MESSAGES`.

Minimum expected key family:

```js
UI_MESSAGES = {
  zh: {
    page_title_login: '登录 - 订阅管理系统',
    login_heading: '登录',
    login_subtitle: '请使用管理员账户登录',
    login_label_username: '用户名',
    login_label_password: '密码',
    login_submit: '登录'
  },
  en: {
    page_title_login: 'Login - Subscription Manager',
    login_heading: 'Login',
    login_subtitle: 'Sign in with your admin account',
    login_label_username: 'Username',
    login_label_password: 'Password',
    login_submit: 'Sign In'
  }
}
```

If the page contains a small number of additional clearly static labels, they may be included too, but the first pass should stay focused.

### 2. Page metadata localisation

Use the existing document metadata hook:

```js
window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_login' });
```

This should set:
- `document.title`
- `document.documentElement.lang`

The static HTML should also use an English fallback `<title>` so the no-JS baseline stays sensible.

### 3. Body-text localisation

Apply `data-i18n` to the login page’s stable visible strings:
- page heading
- subtitle / helper copy
- username label
- password label
- submit button text

Then call:

```js
window.AppLocale.applyTranslations();
```

### 4. Accessibility/local attribute handling

If the page has safe, static attributes such as:
- `aria-label`
- `title`

and they are currently hardcoded, they may use the existing second-wave support:
- `data-i18n-aria-label`
- `data-i18n-title`

But this phase should not introduce broad placeholder localization unless the page already has a clear, static placeholder worth localizing.

## Testing Strategy

### Unit/runtime tests

Extend `tests/core/locale.test.js` with the new login keys.

### Page-level tests

Add page-level regression coverage that verifies:
- `loginPage.html` contains login `data-i18n` markers
- `loginPage.html` calls `applyDocumentMetadata({ titleKey: 'page_title_login' })`
- `loginPage.html` calls `applyTranslations()`
- inline script still compiles after localization changes

If login is served via `src/views/pages.js`, the tests can continue following the same static-template strategy already used elsewhere.

## Scope

### In scope
- `loginPage.html` visible static UI text
- login page browser tab title
- login page `html lang`
- safe accessibility attributes if present and clearly static

### Out of scope
- generic placeholder localization framework
- toast / confirm / alert localization
- backend-generated auth errors beyond their static wrapper text
- persisted language preference

## Risks and Mitigations

### Risk: introducing a second localisation pattern
If login is localized differently from the admin pages, maintenance cost will rise immediately.

**Mitigation:** use the same `AppLocale` + `UI_MESSAGES` + `data-i18n` + metadata-hook model.

### Risk: over-scoping into dynamic auth text
Login often has error states and dynamic validation copy.

**Mitigation:** keep this phase focused on clearly static text first.

## Rollout Plan

### Phase 3A
- Add login-specific keys to `UI_MESSAGES`
- Add login page title/body localisation
- Add regression tests

### Phase 3B
- Move on to dynamic front-end messages such as toast / saving / deleting / sending states

## Decision Summary

Chosen strategy:
- reuse the existing localisation infrastructure
- add login-specific message keys
- localize login static UI, title, and `html lang`
- defer broader dynamic-message work until after login is complete

## User Preference

Do not commit this design document automatically. Leave it uncommitted for manual user review and commit.
