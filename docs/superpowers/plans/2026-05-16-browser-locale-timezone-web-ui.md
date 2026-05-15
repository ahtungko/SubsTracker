# Browser Locale Timezone Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dashboard, admin, and config timezone labels follow the browser's Chinese/English locale with English fallback, while keeping stored timezone values as canonical IANA timezone IDs.

**Architecture:** Add a shared locale catalog in `src/core/locale.js`, generate one injected browser runtime from that catalog, and expose a single `window.AppLocale` formatter to all admin-facing pages through `src/views/pages.js`. Then remove page-local timezone formatters and config-page timezone name tables so dashboard, admin, and config all use the same locale-aware display path.

**Tech Stack:** Cloudflare Workers ESM, inline HTML templates, injected shared browser scripts, Node test runner (`node --experimental-default-type=module --test`)

**User preference:** Do **not** commit during execution. Leave changes uncommitted for user review.

---

## File Structure

### Create
- `src/core/locale.js` — shared UI-locale normalization and timezone display-name catalog for `zh`/`en`
- `src/views/browser-locale-resources.js` — builds the injected browser runtime that attaches `window.AppLocale`
- `tests/core/locale.test.js` — unit tests for locale normalization and English fallback behavior
- `tests/views/browser-locale-timezone.test.js` — page-level regression tests for shared runtime usage and inline script compilation

### Modify
- `src/views/pages.js` — inject browser locale resources alongside existing theme resources
- `src/views/dashboardPage.html` — replace page-local timezone formatter with `window.AppLocale.formatTimezoneDisplay(...)`
- `src/views/adminPage.html` — replace page-local timezone formatter with `window.AppLocale.formatTimezoneDisplay(...)`
- `src/views/configPage.html` — replace page-local timezone formatter and timezone-name arrays with `window.AppLocale`
- `tests/core/time.test.js` — remove page-local Chinese-label assumptions that will no longer be true after browser locale localization

### Leave unchanged in this phase
- `src/core/time.js`
- `src/services/notify/reminder.js`
- `src/api/handlers/subscriptions.js`
- any email / Discord / reminder notification locale behavior

---

### Task 1: Create the shared locale catalog and unit tests

**Files:**
- Create: `tests/core/locale.test.js`
- Create: `src/core/locale.js`

- [ ] **Step 1: Write the failing locale unit test**

Create `tests/core/locale.test.js` with this exact content:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  normalizeUiLocale,
  getTimezoneDisplayName
} from '../../src/core/locale.js';

test('normalizeUiLocale maps Chinese browser locales to zh', () => {
  assert.equal(normalizeUiLocale('zh-CN'), 'zh');
  assert.equal(normalizeUiLocale('zh-MY'), 'zh');
  assert.equal(normalizeUiLocale('zh'), 'zh');
});

test('normalizeUiLocale maps English browser locales to en', () => {
  assert.equal(normalizeUiLocale('en-US'), 'en');
  assert.equal(normalizeUiLocale('en-GB'), 'en');
  assert.equal(normalizeUiLocale('en'), 'en');
});

test('normalizeUiLocale falls back to English for unsupported or missing locales', () => {
  assert.equal(normalizeUiLocale('ms-MY'), 'en');
  assert.equal(normalizeUiLocale('ja-JP'), 'en');
  assert.equal(normalizeUiLocale(''), 'en');
  assert.equal(normalizeUiLocale(undefined), 'en');
});

test('getTimezoneDisplayName returns localized timezone labels with English fallback', () => {
  assert.equal(getTimezoneDisplayName('Asia/Kuala_Lumpur', 'zh-CN'), '吉隆坡时间');
  assert.equal(getTimezoneDisplayName('Asia/Kuala_Lumpur', 'en-US'), 'Kuala Lumpur Time');
  assert.equal(getTimezoneDisplayName('Asia/Kuala_Lumpur', 'ms-MY'), 'Kuala Lumpur Time');
});

test('getTimezoneDisplayName falls back to raw timezone id when label is unknown', () => {
  assert.equal(getTimezoneDisplayName('Mars/Olympus_Mons', 'zh-CN'), 'Mars/Olympus_Mons');
});

test('locale catalog exports English default and the supported timezone ids used by config UI', () => {
  assert.equal(DEFAULT_UI_LOCALE, 'en');
  assert.deepEqual(SUPPORTED_TIMEZONE_IDS, [
    'UTC',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Taipei',
    'Asia/Singapore',
    'Asia/Kuala_Lumpur',
    'Asia/Tokyo',
    'Asia/Seoul',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland'
  ]);
  assert.equal(TIMEZONE_LABELS.zh['Asia/Kuala_Lumpur'], '吉隆坡时间');
  assert.equal(TIMEZONE_LABELS.en['Asia/Kuala_Lumpur'], 'Kuala Lumpur Time');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/core/locale.js`.

- [ ] **Step 3: Write the minimal locale catalog implementation**

Create `src/core/locale.js` with this exact content:

```js
const DEFAULT_UI_LOCALE = 'en';

const SUPPORTED_TIMEZONE_IDS = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Tokyo',
  'Asia/Seoul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland'
];

const TIMEZONE_LABELS = {
  zh: {
    'UTC': '世界标准时间',
    'Asia/Shanghai': '中国标准时间',
    'Asia/Hong_Kong': '香港时间',
    'Asia/Taipei': '台北时间',
    'Asia/Singapore': '新加坡时间',
    'Asia/Kuala_Lumpur': '吉隆坡时间',
    'Asia/Tokyo': '日本时间',
    'Asia/Seoul': '韩国时间',
    'America/New_York': '美国东部时间',
    'America/Chicago': '美国中部时间',
    'America/Denver': '美国山地时间',
    'America/Los_Angeles': '美国太平洋时间',
    'Europe/London': '英国时间',
    'Europe/Paris': '巴黎时间',
    'Europe/Berlin': '柏林时间',
    'Europe/Moscow': '莫斯科时间',
    'Australia/Sydney': '悉尼时间',
    'Australia/Melbourne': '墨尔本时间',
    'Pacific/Auckland': '奥克兰时间'
  },
  en: {
    'UTC': 'UTC',
    'Asia/Shanghai': 'China Standard Time',
    'Asia/Hong_Kong': 'Hong Kong Time',
    'Asia/Taipei': 'Taipei Time',
    'Asia/Singapore': 'Singapore Time',
    'Asia/Kuala_Lumpur': 'Kuala Lumpur Time',
    'Asia/Tokyo': 'Japan Time',
    'Asia/Seoul': 'Korea Time',
    'America/New_York': 'US Eastern Time',
    'America/Chicago': 'US Central Time',
    'America/Denver': 'US Mountain Time',
    'America/Los_Angeles': 'US Pacific Time',
    'Europe/London': 'UK Time',
    'Europe/Paris': 'Paris Time',
    'Europe/Berlin': 'Berlin Time',
    'Europe/Moscow': 'Moscow Time',
    'Australia/Sydney': 'Sydney Time',
    'Australia/Melbourne': 'Melbourne Time',
    'Pacific/Auckland': 'Auckland Time'
  }
};

function normalizeUiLocale(rawLocale) {
  if (typeof rawLocale !== 'string') {
    return DEFAULT_UI_LOCALE;
  }

  const locale = rawLocale.trim().toLowerCase();
  if (!locale) {
    return DEFAULT_UI_LOCALE;
  }

  if (locale === 'zh' || locale.startsWith('zh-')) {
    return 'zh';
  }

  if (locale === 'en' || locale.startsWith('en-')) {
    return 'en';
  }

  return DEFAULT_UI_LOCALE;
}

function getTimezoneDisplayName(timezone, locale = DEFAULT_UI_LOCALE) {
  const resolvedLocale = normalizeUiLocale(locale);
  const localizedLabels = TIMEZONE_LABELS[resolvedLocale] || TIMEZONE_LABELS[DEFAULT_UI_LOCALE];
  const fallbackLabels = TIMEZONE_LABELS[DEFAULT_UI_LOCALE] || {};

  return localizedLabels[timezone] || fallbackLabels[timezone] || timezone;
}

export {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  normalizeUiLocale,
  getTimezoneDisplayName
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: PASS, 6 tests passing.

- [ ] **Step 5: Stop without committing**

Do not create a git commit. Leave the new file and test uncommitted for the user.

---

### Task 2: Inject one shared browser locale runtime into every admin-facing page

**Files:**
- Create: `tests/views/browser-locale-timezone.test.js`
- Create: `src/views/browser-locale-resources.js`
- Modify: `src/views/pages.js`

- [ ] **Step 1: Write the failing runtime-injection regression test**

Create `tests/views/browser-locale-timezone.test.js` with this exact content:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const pagesJs = fs.readFileSync(path.join(repoRoot, 'src/views/pages.js'), 'utf8');
const runtimeJs = fs.readFileSync(path.join(repoRoot, 'src/views/browser-locale-resources.js'), 'utf8');

test('pages inject shared browser locale resources alongside theme resources', () => {
  assert.match(pagesJs, /buildBrowserLocaleResources/);
  assert.match(pagesJs, /const sharedResources = themeResourcesHtml \+ '\\n' \+ buildBrowserLocaleResources\(\);/);
  assert.match(pagesJs, /return html\.replace\(/);
});

test('browser locale runtime exposes AppLocale helpers and supported timezone ids', () => {
  assert.match(runtimeJs, /window\.AppLocale/);
  assert.match(runtimeJs, /SUPPORTED_TIMEZONE_IDS/);
  assert.match(runtimeJs, /getPreferredLocale/);
  assert.match(runtimeJs, /formatTimezoneDisplay/);
  assert.match(runtimeJs, /getTimezoneDisplayName/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-locale-timezone.test.js
```

Expected: FAIL because `src/views/browser-locale-resources.js` does not exist and `pages.js` does not inject it.

- [ ] **Step 3: Create the shared browser runtime and wire it into page injection**

Create `src/views/browser-locale-resources.js` with this exact content:

```js
import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  normalizeUiLocale,
  getTimezoneDisplayName
} from '../core/locale.js';

function buildBrowserLocaleResources() {
  return `<script>
  (function() {
    const DEFAULT_UI_LOCALE = ${JSON.stringify(DEFAULT_UI_LOCALE)};
    const SUPPORTED_TIMEZONE_IDS = ${JSON.stringify(SUPPORTED_TIMEZONE_IDS)};
    const TIMEZONE_LABELS = ${JSON.stringify(TIMEZONE_LABELS)};
    const normalizeUiLocale = ${normalizeUiLocale.toString()};
    const getTimezoneDisplayName = ${getTimezoneDisplayName.toString()};

    function getPreferredLocale() {
      const preferredLocale = Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages[0]
        : navigator.language;

      return normalizeUiLocale(preferredLocale || DEFAULT_UI_LOCALE);
    }

    function getTimezoneOffset(timezone) {
      const now = new Date();
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const parts = dtf.formatToParts(now);
      const get = type => Number(parts.find(x => x.type === type).value);
      const zonedTimestamp = Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour'),
        get('minute'),
        get('second')
      );

      return Math.round((zonedTimestamp - now.getTime()) / (1000 * 60 * 60));
    }

    function formatTimezoneDisplay(timezone, locale) {
      try {
        const resolvedLocale = normalizeUiLocale(locale || getPreferredLocale());
        const label = getTimezoneDisplayName(timezone, resolvedLocale);
        const offset = getTimezoneOffset(timezone);
        const offsetStr = offset >= 0 ? '+' + offset : String(offset);
        return `${label} (UTC${offsetStr})`;
      } catch (error) {
        console.error('formatTimezoneDisplay failed:', error);
        return timezone;
      }
    }

    window.AppLocale = Object.freeze({
      DEFAULT_UI_LOCALE,
      SUPPORTED_TIMEZONE_IDS,
      normalizeUiLocale,
      getPreferredLocale,
      getTimezoneDisplayName,
      formatTimezoneDisplay
    });
  })();
</script>`;
}

export { buildBrowserLocaleResources };
```

Modify `src/views/pages.js` so it becomes:

```js
import themeResourcesHtml from './theme-resources.html';
import { buildBrowserLocaleResources } from './browser-locale-resources.js';
import loginPageHtml from './loginPage.html';
import adminPageHtml from './adminPage.html';
import configPageHtml from './configPage.html';
import dashboardPageHtml from './dashboardPage.html';

const sharedResources = themeResourcesHtml + '\n' + buildBrowserLocaleResources();

function injectTheme(html) {
  return html.replace(/\$\{themeResources\}/g, sharedResources);
}

const loginPage = injectTheme(loginPageHtml);
const adminPage = injectTheme(adminPageHtml);
const configPage = injectTheme(configPageHtml);

function dashboardPage() {
  return injectTheme(dashboardPageHtml);
}

export { loginPage, adminPage, configPage, dashboardPage };
```

- [ ] **Step 4: Run the runtime-injection test to verify it passes**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-locale-timezone.test.js
```

Expected: PASS, 8 tests passing.

- [ ] **Step 5: Stop without committing**

Do not create a git commit. Leave these changes uncommitted for the user.

---

### Task 3: Migrate dashboard, admin, and config to the shared locale formatter

**Files:**
- Modify: `tests/views/browser-locale-timezone.test.js`
- Modify: `src/views/dashboardPage.html`
- Modify: `src/views/adminPage.html`
- Modify: `src/views/configPage.html`

- [ ] **Step 1: Extend the failing page-level regression test**

Append these helpers and tests to `tests/views/browser-locale-timezone.test.js`:

```js
const dashboardPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/dashboardPage.html'), 'utf8');
const adminPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/adminPage.html'), 'utf8');
const configPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/configPage.html'), 'utf8');

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function getFirstInlineScript(html) {
  const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'expected page HTML to contain an inline script');
  return match[1];
}

test('dashboard and admin use shared timezone formatter instead of page-local copies', () => {
  assert.equal(countMatches(dashboardPageHtml, /function formatTimezoneDisplay\(/g), 0);
  assert.equal(countMatches(adminPageHtml, /function formatTimezoneDisplay\(/g), 0);
  assert.equal(dashboardPageHtml.includes('window.AppLocale.formatTimezoneDisplay(localTimezone)'), true);
  assert.equal(adminPageHtml.includes('window.AppLocale.formatTimezoneDisplay(localTimezone)'), true);
});

test('config page builds timezone labels from shared AppLocale data', () => {
  assert.equal(countMatches(configPageHtml, /function formatTimezoneDisplay\(/g), 0);
  assert.equal(configPageHtml.includes('window.AppLocale.SUPPORTED_TIMEZONE_IDS'), true);
  assert.equal(configPageHtml.includes('window.AppLocale.formatTimezoneDisplay(timezoneId)'), true);
  assert.equal(configPageHtml.includes("name: '吉隆坡时间'"), false);
  assert.equal(configPageHtml.includes('<option value="Asia/Kuala_Lumpur">吉隆坡时间'), false);
});

test('dashboard, admin, and config inline scripts still compile after locale refactor', () => {
  assert.doesNotThrow(() => new Function(getFirstInlineScript(dashboardPageHtml)));
  assert.doesNotThrow(() => new Function(getFirstInlineScript(adminPageHtml)));
  assert.doesNotThrow(() => new Function(getFirstInlineScript(configPageHtml)));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-locale-timezone.test.js
```

Expected: FAIL because all three pages still define page-local `formatTimezoneDisplay()` logic and config still hardcodes timezone names.

- [ ] **Step 3: Replace dashboard and admin page-local timezone formatters**

In `src/views/dashboardPage.html`, remove the nested `function formatTimezoneDisplay(tz) { ... }` inside `showSystemTime()` and replace the display line with:

```js
const tzStr = window.AppLocale.formatTimezoneDisplay(localTimezone);
```

In `src/views/adminPage.html`, remove the nested `function formatTimezoneDisplay(tz) { ... }` inside `showSystemTime()` and replace the display line with:

```js
const tzStr = window.AppLocale.formatTimezoneDisplay(localTimezone);
```

The surrounding `update()` behavior should remain unchanged.

- [ ] **Step 4: Replace config-page timezone labels with shared AppLocale data**

In `src/views/configPage.html`, replace the hardcoded timezone options block with an empty select shell so there is no Chinese-only fallback list baked into the markup:

```html
<select id="timezone" name="timezone" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"></select>
```

Still in `src/views/configPage.html`, replace the current `generateTimezoneOptions(selectedTimezone = 'UTC')` implementation with this exact version:

```js
function generateTimezoneOptions(selectedTimezone = 'UTC') {
  const timezoneSelect = document.getElementById('timezone');
  const fallbackTimezone = 'UTC';
  const timezoneIds = window.AppLocale?.SUPPORTED_TIMEZONE_IDS || [fallbackTimezone];

  timezoneSelect.innerHTML = '';

  timezoneIds.forEach(timezoneId => {
    const option = document.createElement('option');
    option.value = timezoneId;
    option.textContent = window.AppLocale.formatTimezoneDisplay(timezoneId);
    timezoneSelect.appendChild(option);
  });

  const timezoneExists = timezoneIds.includes(selectedTimezone);
  timezoneSelect.value = timezoneExists ? selectedTimezone : fallbackTimezone;

  if (!timezoneExists) {
    showToast('检测到未知时区配置，已回退为 UTC，请重新确认后保存', 'warning', 4500);
  }
}
```

Also replace the system-time display line inside config page `showSystemTime()` with:

```js
const tzStr = window.AppLocale.formatTimezoneDisplay(globalTimezone);
```

And delete the page-local `function formatTimezoneDisplay(tz) { ... }` from `src/views/configPage.html` entirely.

- [ ] **Step 5: Run the page-level regression test to verify it passes**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-locale-timezone.test.js
```

Expected: PASS. The page-level regression suite should confirm shared formatter usage, removal of page-local timezone maps, and compile-safe inline scripts.

- [ ] **Step 6: Stop without committing**

Do not create a git commit. Leave these changes uncommitted for the user.

---

### Task 4: Replace outdated timezone tests and run full regression

**Files:**
- Modify: `tests/core/time.test.js`
- Test: `tests/core/locale.test.js`
- Test: `tests/views/browser-locale-timezone.test.js`
- Test: `tests/views/currency-myr.test.js`

- [ ] **Step 1: Run the existing timezone tests to capture the old assumptions failing**

Run:

```bash
node --experimental-default-type=module --test tests/core/time.test.js
```

Expected: FAIL because the old tests assume Chinese-only timezone labels inside raw page HTML and config-page option lists.

- [ ] **Step 2: Replace the outdated test file with server-only coverage for this phase**

Replace `tests/core/time.test.js` with this exact content:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { formatTimezoneDisplay } from '../../src/core/time.js';

test('server-side formatTimezoneDisplay still labels Kuala Lumpur with UTC+8', () => {
  assert.equal(formatTimezoneDisplay('Asia/Kuala_Lumpur'), '吉隆坡时间 (UTC+8)');
});
```

- [ ] **Step 3: Run the targeted regression suite**

Run:

```bash
node --experimental-default-type=module --test tests/core/time.test.js tests/core/locale.test.js tests/views/browser-locale-timezone.test.js tests/views/currency-myr.test.js
```

Expected: PASS, including the existing admin inline-script regression from `tests/views/currency-myr.test.js`.

- [ ] **Step 4: Run the full project test suite**

Run:

```bash
npm test
```

Expected: PASS with zero failing tests.

- [ ] **Step 5: Final handoff without commit**

Do not commit. Summarize the touched files and leave the working tree dirty for the user to review and commit manually.

---

## Self-Review

### Spec coverage
- Browser locale detection: covered by `normalizeUiLocale()` and `getPreferredLocale()` in Tasks 1-2.
- Chinese/English + English fallback: covered by the locale catalog and unit tests in Task 1.
- Shared frontend helper: covered by `src/views/browser-locale-resources.js` and `src/views/pages.js` in Task 2.
- Dashboard/admin/config migration: covered by Task 3.
- Regression safety: covered by compile tests and full test runs in Tasks 3-4.
- Notifications deferred: preserved explicitly by leaving server-side reminder/email/Discord localization untouched.

### Placeholder scan
- No placeholder markers remain.
- Every code-changing step includes exact file content or exact replacement snippets.
- Every verification step includes a concrete command and expected outcome.

### Type consistency
- Shared runtime API is consistently named `window.AppLocale`.
- Locale helpers are consistently named `normalizeUiLocale`, `getPreferredLocale`, `getTimezoneDisplayName`, and `formatTimezoneDisplay`.
- Shared timezone catalog constant is consistently named `SUPPORTED_TIMEZONE_IDS`.
