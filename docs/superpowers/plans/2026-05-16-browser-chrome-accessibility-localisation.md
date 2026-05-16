# Browser Chrome and Accessibility Localisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add second-wave browser-locale localisation for page titles, `html lang`, and selected accessibility/browser-chrome attributes on dashboard, admin, and config pages, while reusing the existing `AppLocale` and `UI_MESSAGES` foundation.

**Architecture:** Extend the shared locale catalog with title/accessibility keys, expand the injected browser runtime with narrow attribute-translation and document-metadata helpers, then update dashboard/admin/config pages to call `applyDocumentMetadata(...)` and localize the mobile-menu `aria-label` via declarative markers. Keep login, placeholder-wide support, and notification-channel localisation out of scope.

**Tech Stack:** Cloudflare Workers ESM, inline HTML templates, injected shared browser scripts, Node test runner (`node --experimental-default-type=module --test`)

**User preference:** Do **not** commit during execution. Leave changes uncommitted for user review.

---

## File Structure

### Modify
- `src/core/locale.js` — add browser-title and accessibility message keys
- `src/views/browser-locale-resources.js` — add attribute translation and document metadata helpers to `window.AppLocale`
- `src/views/dashboardPage.html` — localize `<title>`, `html lang`, and mobile-menu `aria-label`; call `applyDocumentMetadata(...)`
- `src/views/adminPage.html` — localize `<title>` and mobile-menu `aria-label`; call `applyDocumentMetadata(...)`
- `src/views/configPage.html` — localize `<title>` and mobile-menu `aria-label`; call `applyDocumentMetadata(...)`
- `tests/core/locale.test.js` — add coverage for new message keys
- `tests/views/browser-ui-localisation.test.js` — extend runtime and page-level coverage for metadata + attribute localization

### Leave unchanged in this phase
- `src/views/loginPage.html`
- general placeholder localisation
- toast / confirm / alert localisation
- backend-generated notification text
- persisted user language preference

---

## New Message Keys

These exact keys should be added to `UI_MESSAGES` and used in this phase:
- `page_title_dashboard`
- `page_title_admin`
- `page_title_config`
- `aria_toggle_navigation_menu`

Expected values:

### zh
- `page_title_dashboard`: `仪表盘 - SubsTracker`
- `page_title_admin`: `订阅管理系统`
- `page_title_config`: `系统配置 - 订阅管理系统`
- `aria_toggle_navigation_menu`: `切换导航菜单`

### en
- `page_title_dashboard`: `Dashboard - SubsTracker`
- `page_title_admin`: `Subscription Manager`
- `page_title_config`: `Settings - Subscription Manager`
- `aria_toggle_navigation_menu`: `Toggle navigation menu`

---

### Task 1: Extend the shared locale catalog with browser-chrome keys

**Files:**
- Modify: `tests/core/locale.test.js`
- Modify: `src/core/locale.js`

- [ ] **Step 1: Add failing unit tests for title/accessibility keys**

Append these tests to `tests/core/locale.test.js`:

```js
test('getMessage returns localized browser-title strings', () => {
  assert.equal(getMessage('page_title_dashboard', 'zh-CN'), '仪表盘 - SubsTracker');
  assert.equal(getMessage('page_title_dashboard', 'en-US'), 'Dashboard - SubsTracker');
  assert.equal(getMessage('page_title_config', 'ja-JP'), 'Settings - Subscription Manager');
});

test('getMessage returns localized accessibility labels', () => {
  assert.equal(getMessage('aria_toggle_navigation_menu', 'zh-CN'), '切换导航菜单');
  assert.equal(getMessage('aria_toggle_navigation_menu', 'en-US'), 'Toggle navigation menu');
});
```

Also extend the existing catalog-export test with these assertions:

```js
  assert.equal(UI_MESSAGES.zh.page_title_dashboard, '仪表盘 - SubsTracker');
  assert.equal(UI_MESSAGES.en.page_title_dashboard, 'Dashboard - SubsTracker');
  assert.equal(UI_MESSAGES.zh.aria_toggle_navigation_menu, '切换导航菜单');
  assert.equal(UI_MESSAGES.en.aria_toggle_navigation_menu, 'Toggle navigation menu');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: FAIL because the new message keys do not exist yet.

- [ ] **Step 3: Add the browser-chrome message keys**

In `src/core/locale.js`, add these four keys to both locales inside `UI_MESSAGES`:

```js
    page_title_dashboard: '仪表盘 - SubsTracker',
    page_title_admin: '订阅管理系统',
    page_title_config: '系统配置 - 订阅管理系统',
    aria_toggle_navigation_menu: '切换导航菜单',
```

```js
    page_title_dashboard: 'Dashboard - SubsTracker',
    page_title_admin: 'Subscription Manager',
    page_title_config: 'Settings - Subscription Manager',
    aria_toggle_navigation_menu: 'Toggle navigation menu',
```

Place them near the top of each locale block, alongside the shared navigation/app labels.

- [ ] **Step 4: Run the locale tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: PASS, including the new title/accessibility key coverage.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 2: Expand the browser runtime with metadata and attribute localization

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/browser-locale-resources.js`

- [ ] **Step 1: Extend the failing runtime regression test first**

In `tests/views/browser-ui-localisation.test.js`, update the existing `browser locale runtime exposes getMessage and applyTranslations` test as follows:

1. Replace the current `translatedNodes` array with:

```js
  const translatedNodes = [
    {
      dataset: { i18n: 'nav_dashboard' },
      textContent: '仪表盘',
      getAttribute(name) {
        return name === 'data-i18n' ? this.dataset.i18n : null;
      }
    },
    {
      dataset: { i18n: 'config_save' },
      textContent: '保存设置',
      getAttribute(name) {
        return name === 'data-i18n' ? this.dataset.i18n : null;
      }
    },
    {
      dataset: { i18nAriaLabel: 'aria_toggle_navigation_menu' },
      attributes: { 'aria-label': '切换导航菜单' },
      getAttribute(name) {
        if (name === 'data-i18n-aria-label') return this.dataset.i18nAriaLabel;
        return this.attributes[name] || null;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    },
    {
      dataset: { i18nTitle: 'page_title_dashboard' },
      attributes: { title: '仪表盘 - SubsTracker' },
      getAttribute(name) {
        if (name === 'data-i18n-title') return this.dataset.i18nTitle;
        return this.attributes[name] || null;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    }
  ];
```

2. Replace the current `documentStub` with:

```js
  const documentStub = {
    title: '仪表盘 - SubsTracker',
    documentElement: { lang: 'zh-CN' },
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') {
        return translatedNodes.filter(node => node.dataset?.i18n);
      }
      if (selector === '[data-i18n-aria-label]') {
        return translatedNodes.filter(node => node.dataset?.i18nAriaLabel);
      }
      if (selector === '[data-i18n-title]') {
        return translatedNodes.filter(node => node.dataset?.i18nTitle);
      }
      throw new Error('Unexpected selector: ' + selector);
    }
  };
```

3. After the existing assertions for `getMessage(...)`, add:

```js
  assert.equal(typeof AppLocale.applyDocumentMetadata, 'function');
```

4. Replace the current translation application call:

```js
  AppLocale.applyTranslations(documentStub, 'en-US');
```

with:

```js
  AppLocale.applyDocumentMetadata({ titleKey: 'page_title_dashboard' }, documentStub, 'en-US');
  AppLocale.applyTranslations(documentStub, 'en-US');
```

5. After the two existing `textContent` assertions, add:

```js
  assert.equal(translatedNodes[2].attributes['aria-label'], 'Toggle navigation menu');
  assert.equal(translatedNodes[3].attributes.title, 'Dashboard - SubsTracker');
  assert.equal(documentStub.title, 'Dashboard - SubsTracker');
  assert.equal(documentStub.documentElement.lang, 'en');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because the runtime does not yet support `data-i18n-aria-label`, `data-i18n-title`, or `applyDocumentMetadata()`.

- [ ] **Step 3: Implement metadata and attribute localization in the runtime**

In `src/views/browser-locale-resources.js`, add this helper before `window.AppLocale = Object.freeze(...)`:

```js
    function applyAttributeTranslations(root, selector, attributeName, datasetKey, locale) {
      const nodes = root.querySelectorAll(selector);
      nodes.forEach((node) => {
        const key = node.getAttribute(datasetKey);
        if (!key) return;
        node.setAttribute(attributeName, getMessage(key, locale));
      });
    }
```

Replace the existing `applyTranslations(root = document, locale)` with:

```js
    function applyTranslations(root = document, locale) {
      const resolvedLocale = normalizeUiLocale(locale || getPreferredLocale());
      const nodes = root.querySelectorAll('[data-i18n]');

      nodes.forEach((node) => {
        const key = node.getAttribute('data-i18n') || node.dataset?.i18n;
        if (!key) return;
        node.textContent = getMessage(key, resolvedLocale);
      });

      applyAttributeTranslations(root, '[data-i18n-aria-label]', 'aria-label', 'data-i18n-aria-label', resolvedLocale);
      applyAttributeTranslations(root, '[data-i18n-title]', 'title', 'data-i18n-title', resolvedLocale);
    }
```

Then add this helper before the frozen runtime object:

```js
    function applyDocumentMetadata({ titleKey }, root = document, locale) {
      const resolvedLocale = normalizeUiLocale(locale || getPreferredLocale());
      if (titleKey) {
        root.title = getMessage(titleKey, resolvedLocale);
      }
      if (root.documentElement) {
        root.documentElement.lang = resolvedLocale === 'zh' ? 'zh-CN' : 'en';
      }
    }
```

Finally extend the frozen runtime surface to include `applyDocumentMetadata`:

```js
    window.AppLocale = Object.freeze({
      DEFAULT_UI_LOCALE,
      SUPPORTED_TIMEZONE_IDS,
      normalizeUiLocale,
      getPreferredLocale,
      getTimezoneDisplayName,
      formatTimezoneDisplay,
      getMessage,
      applyTranslations,
      applyDocumentMetadata
    });
```

- [ ] **Step 4: Run runtime regression tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js
```

Expected: PASS. The runtime should continue satisfying first-wave localisation and timezone behavior while adding metadata/attribute support.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 3: Localise dashboard browser chrome and accessibility text

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/dashboardPage.html`

- [ ] **Step 1: Extend the dashboard page regression test first**

Append this test to `tests/views/browser-ui-localisation.test.js`:

```js
test('dashboard localises title metadata and mobile-menu aria-label', () => {
  assert.equal(dashboardPageHtml.includes('<html lang="en">'), false);
  assert.equal(dashboardPageHtml.includes('data-i18n-aria-label="aria_toggle_navigation_menu"'), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_dashboard' });"), true);
  assert.equal(dashboardPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `dashboardPage.html` does not yet call `applyDocumentMetadata(...)` or expose the `data-i18n-aria-label` marker.

- [ ] **Step 3: Update dashboard title/lang/aria wiring**

In `src/views/dashboardPage.html`:

1. Change the opening tag from:

```html
<html lang="zh-CN">
```

to:

```html
<html>
```

2. Change the title from:

```html
<title>仪表盘 - SubsTracker</title>
```

to the English fallback title:

```html
<title>Dashboard - SubsTracker</title>
```

3. On the mobile-menu button, replace the hardcoded `aria-label` with:

```html
<button id="mobile-menu-btn" type="button" aria-expanded="false" data-i18n-aria-label="aria_toggle_navigation_menu" aria-label="切换导航菜单" class="...">
```

Keep the existing classes and structure intact.

4. Near the top of the bottom `<script>` block, replace the current translation call sequence with:

```js
    window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_dashboard' });
    window.AppLocale.applyTranslations();
```

Ensure `applyDocumentMetadata(...)` appears before `applyTranslations()`.

- [ ] **Step 4: Run the dashboard metadata tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js
```

Expected: PASS.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 4: Localise admin browser chrome and accessibility text

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/adminPage.html`

- [ ] **Step 1: Extend the admin page regression test first**

Append this test to `tests/views/browser-ui-localisation.test.js`:

```js
test('admin localises title metadata and mobile-menu aria-label', () => {
  assert.equal(adminPageHtml.includes('data-i18n-aria-label="aria_toggle_navigation_menu"'), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_admin' });"), true);
  assert.equal(adminPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `adminPage.html` does not yet call `applyDocumentMetadata(...)` or expose the new aria-label marker.

- [ ] **Step 3: Update admin title/aria wiring**

In `src/views/adminPage.html`:

1. Change the title from:

```html
<title>订阅管理系统</title>
```

to the English fallback title:

```html
<title>Subscription Manager</title>
```

2. On the mobile-menu button, replace the hardcoded `aria-label` with:

```html
<button id="mobile-menu-btn" type="button" aria-expanded="false" data-i18n-aria-label="aria_toggle_navigation_menu" aria-label="切换导航菜单" class="...">
```

Keep the existing classes and structure intact.

3. Near the top of the bottom `<script>` block, replace the current translation call sequence with:

```js
    window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_admin' });
    window.AppLocale.applyTranslations();
```

Ensure `applyDocumentMetadata(...)` appears before `applyTranslations()`.

- [ ] **Step 4: Run the admin metadata tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js tests/views/currency-myr.test.js
```

Expected: PASS.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 5: Localise config browser chrome and accessibility text, then run full regression

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/configPage.html`
- Test: `tests/core/locale.test.js`
- Test: `tests/views/browser-locale-timezone.test.js`
- Test: `tests/views/browser-ui-localisation.test.js`
- Test: `tests/views/currency-myr.test.js`

- [ ] **Step 1: Extend the config page regression test first**

Append this test to `tests/views/browser-ui-localisation.test.js`:

```js
test('config localises title metadata and mobile-menu aria-label', () => {
  assert.equal(configPageHtml.includes('data-i18n-aria-label="aria_toggle_navigation_menu"'), true);
  assert.equal(configPageHtml.includes("window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_config' });"), true);
  assert.equal(configPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `configPage.html` does not yet call `applyDocumentMetadata(...)` or expose the new aria-label marker.

- [ ] **Step 3: Update config title/aria wiring**

In `src/views/configPage.html`:

1. Change the title from:

```html
<title>系统配置 - 订阅管理系统</title>
```

to the English fallback title:

```html
<title>Settings - Subscription Manager</title>
```

2. On the mobile-menu button, replace the hardcoded `aria-label` with:

```html
<button id="mobile-menu-btn" type="button" aria-expanded="false" data-i18n-aria-label="aria_toggle_navigation_menu" aria-label="切换导航菜单" class="...">
```

Keep the existing classes and structure intact.

3. Near the top of the bottom `<script>` block, replace the current translation call sequence with:

```js
    window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_config' });
    window.AppLocale.applyTranslations();
```

Ensure `applyDocumentMetadata(...)` appears before `applyTranslations()`.

- [ ] **Step 4: Run the targeted regression suite**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js tests/views/currency-myr.test.js
```

Expected: PASS.

- [ ] **Step 5: Run the full project test suite**

Run:

```bash
npm test
```

Expected: PASS with zero failing tests.

- [ ] **Step 6: Final handoff without commit**

Do not commit. Summarize the touched files and leave the working tree dirty for the user to review and commit manually.

---

## Self-Review

### Spec coverage
- New title/accessibility message keys: covered by Task 1.
- Runtime attribute + document metadata support: covered by Task 2.
- Page title/lang/aria support on dashboard/admin/config: covered by Tasks 3-5.
- Login/placeholder/general attribute framework still deferred: preserved by file scope and out-of-scope list.

### Placeholder scan
- No placeholder markers remain.
- Every code-changing step includes exact code snippets.
- Every verification step includes a concrete command and expected outcome.

### Type consistency
- Shared runtime names are consistently `applyTranslations()` and `applyDocumentMetadata()`.
- Shared message keys are consistently `page_title_*` and `aria_toggle_navigation_menu`.
- Page-level calls consistently use `window.AppLocale.applyDocumentMetadata({ titleKey: '...' });` before `window.AppLocale.applyTranslations();`.
