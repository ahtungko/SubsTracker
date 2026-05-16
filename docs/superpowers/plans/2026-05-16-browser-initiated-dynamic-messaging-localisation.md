# Browser-Initiated Dynamic Messaging Localisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localise browser-triggered dynamic UI messages and browser-initiated API `message` responses in zh/en, with the browser sending locale to the backend and unsupported locales falling back to English.

**Architecture:** Add shared server-side locale extraction and backend message lookup, extend the browser runtime with request-locale headers, then update key API handlers plus browser pages so frontend-local dynamic strings use `window.AppLocale.getMessage()` while backend response `message` fields are localized server-side using the request locale.

**Tech Stack:** Cloudflare Workers ESM, inline HTML templates, injected shared browser scripts, Node test runner (`node --experimental-default-type=module --test`)

**User preference:** Do **not** commit during execution. Leave changes uncommitted for user review.

---

## File Structure

### Create
- `src/api/locale.js` — shared request-locale extraction and server message lookup for browser-triggered API flows
- `tests/api/locale.test.js` — unit tests for request-locale extraction and backend message lookup

### Modify
- `src/views/browser-locale-resources.js` — add request-locale header helper for browser fetch calls
- `src/api/router.js` — localize shared unauthorized/not-found API messages
- `src/api/handlers/auth.js` — localize browser login failure response message
- `src/api/handlers/config.js` — localize config save success/failure response messages
- `src/api/handlers/dashboard.js` — localize dashboard fetch failure response messages
- `src/api/handlers/subscriptions.js` — localize common browser-triggered subscription action messages
- `src/api/handlers/test-notification.js` — localize browser-triggered test-notification messages
- `src/views/adminPage.html` — add locale headers to fetch calls and replace front-end-only dynamic strings with `window.AppLocale.getMessage()` where appropriate
- `src/views/configPage.html` — add locale headers to fetch calls and replace front-end-only dynamic strings with `window.AppLocale.getMessage()` where appropriate
- `src/views/dashboardPage.html` — add locale headers to fetch calls and localize browser-only fallback strings where appropriate
- `src/views/loginPage.html` — keep locale-aware browser-side dynamic messages aligned with the new request-locale flow if needed
- `tests/views/browser-ui-localisation.test.js` — extend runtime coverage for request-locale headers and targeted page-level dynamic-string regressions

### Leave unchanged in this phase
- cron-triggered reminders
- background-job / scheduler initiated notifications
- email / Discord / reminder language preference for out-of-browser delivery
- persisted user language settings

---

## Backend Message Keys

Create a small backend-oriented message catalog keyed for browser-triggered API responses.

Minimum first-wave server message keys:
- `api_unauthorized`
- `api_not_found`
- `login_invalid_credentials`
- `config_update_failed_prefix`
- `dashboard_fetch_failed_prefix`
- `test_notification_missing_type`
- `test_notification_unsupported_type_prefix`
- `test_notification_failed_prefix`
- `subscription_not_found`
- `subscription_test_button_missing`
- `subscription_test_missing_id`
- `subscription_fetch_failed`

Only include keys that are actually used in the handlers touched by this plan. Do not try to localize every message in the whole repo at once.

---

### Task 1: Add shared server locale utilities and tests

**Files:**
- Create: `tests/api/locale.test.js`
- Create: `src/api/locale.js`

- [ ] **Step 1: Write the failing server-locale unit test**

Create `tests/api/locale.test.js` with this exact content:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractRequestLocale,
  getServerMessage,
  normalizeServerLocale,
  SERVER_MESSAGES
} from '../../src/api/locale.js';

test('normalizeServerLocale maps zh/en variants and falls back to English', () => {
  assert.equal(normalizeServerLocale('zh-CN'), 'zh');
  assert.equal(normalizeServerLocale('zh-MY'), 'zh');
  assert.equal(normalizeServerLocale('en-US'), 'en');
  assert.equal(normalizeServerLocale('en-GB'), 'en');
  assert.equal(normalizeServerLocale('ms-MY'), 'en');
  assert.equal(normalizeServerLocale(undefined), 'en');
});

test('extractRequestLocale reads X-Locale and falls back to English', () => {
  const zhRequest = new Request('https://example.com/api/test', {
    headers: { 'X-Locale': 'zh-CN' }
  });
  const enRequest = new Request('https://example.com/api/test', {
    headers: { 'X-Locale': 'en-US' }
  });
  const fallbackRequest = new Request('https://example.com/api/test');

  assert.equal(extractRequestLocale(zhRequest), 'zh');
  assert.equal(extractRequestLocale(enRequest), 'en');
  assert.equal(extractRequestLocale(fallbackRequest), 'en');
});

test('getServerMessage returns localized backend messages with English fallback', () => {
  assert.equal(getServerMessage('api_unauthorized', 'zh-CN'), '未授权访问');
  assert.equal(getServerMessage('api_unauthorized', 'en-US'), 'Unauthorized access');
  assert.equal(getServerMessage('api_unauthorized', 'ja-JP'), 'Unauthorized access');
});

test('getServerMessage falls back to key for unknown messages', () => {
  assert.equal(getServerMessage('missing_server_message', 'zh-CN'), 'missing_server_message');
});

test('server catalog exports expected core API message keys', () => {
  assert.equal(SERVER_MESSAGES.zh.api_unauthorized, '未授权访问');
  assert.equal(SERVER_MESSAGES.en.api_unauthorized, 'Unauthorized access');
  assert.equal(SERVER_MESSAGES.zh.login_invalid_credentials, '用户名或密码错误');
  assert.equal(SERVER_MESSAGES.en.login_invalid_credentials, 'Incorrect username or password');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/api/locale.test.js
```

Expected: FAIL because `src/api/locale.js` does not exist yet.

- [ ] **Step 3: Implement the shared server locale utilities**

Create `src/api/locale.js` with this exact content:

```js
const DEFAULT_SERVER_LOCALE = 'en';

const SERVER_MESSAGES = {
  zh: {
    api_unauthorized: '未授权访问',
    api_not_found: '未找到请求的资源',
    login_invalid_credentials: '用户名或密码错误',
    config_update_failed_prefix: '更新配置失败: ',
    dashboard_fetch_failed_prefix: '获取统计数据失败: ',
    test_notification_missing_type: '缺少测试类型参数 type',
    test_notification_unsupported_type_prefix: '不支持的测试类型: ',
    test_notification_failed_prefix: '测试通知失败: ',
    subscription_not_found: '未找到该订阅',
    subscription_test_button_missing: '未找到测试按钮，请刷新页面后重试',
    subscription_test_missing_id: '订阅 ID 缺失，无法发送测试通知',
    subscription_fetch_failed: '获取订阅信息时发生错误'
  },
  en: {
    api_unauthorized: 'Unauthorized access',
    api_not_found: 'Requested resource not found',
    login_invalid_credentials: 'Incorrect username or password',
    config_update_failed_prefix: 'Failed to update config: ',
    dashboard_fetch_failed_prefix: 'Failed to fetch dashboard stats: ',
    test_notification_missing_type: 'Missing required test type parameter: type',
    test_notification_unsupported_type_prefix: 'Unsupported test type: ',
    test_notification_failed_prefix: 'Test notification failed: ',
    subscription_not_found: 'Subscription not found',
    subscription_test_button_missing: 'Test button not found. Please refresh and try again.',
    subscription_test_missing_id: 'Subscription ID is missing, so the test notification cannot be sent.',
    subscription_fetch_failed: 'Failed to fetch subscription information'
  }
};

function normalizeServerLocale(rawLocale) {
  if (typeof rawLocale !== 'string') return DEFAULT_SERVER_LOCALE;
  const locale = rawLocale.trim().toLowerCase();
  if (!locale) return DEFAULT_SERVER_LOCALE;
  if (locale === 'zh' || locale.startsWith('zh-')) return 'zh';
  if (locale === 'en' || locale.startsWith('en-')) return 'en';
  return DEFAULT_SERVER_LOCALE;
}

function extractRequestLocale(request) {
  return normalizeServerLocale(request.headers.get('X-Locale'));
}

function getServerMessage(key, locale = DEFAULT_SERVER_LOCALE) {
  const resolvedLocale = normalizeServerLocale(locale);
  const localizedMessages = SERVER_MESSAGES[resolvedLocale] || SERVER_MESSAGES[DEFAULT_SERVER_LOCALE] || {};
  const fallbackMessages = SERVER_MESSAGES[DEFAULT_SERVER_LOCALE] || {};
  return localizedMessages[key] || fallbackMessages[key] || key;
}

export {
  DEFAULT_SERVER_LOCALE,
  SERVER_MESSAGES,
  normalizeServerLocale,
  extractRequestLocale,
  getServerMessage
};
```

- [ ] **Step 4: Run the server-locale tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/api/locale.test.js
```

Expected: PASS.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 2: Add browser locale request headers to the shared runtime

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/browser-locale-resources.js`

- [ ] **Step 1: Extend the failing browser runtime test first**

In `tests/views/browser-ui-localisation.test.js`, inside the existing `browser locale runtime exposes getMessage and applyTranslations` test, add these assertions after the existing `applyDocumentMetadata` assertion:

```js
  assert.equal(typeof AppLocale.getRequestHeaders, 'function');
  assert.deepEqual(AppLocale.getRequestHeaders('zh-CN'), { 'X-Locale': 'zh' });
  assert.deepEqual(AppLocale.getRequestHeaders('en-US'), { 'X-Locale': 'en' });
  assert.deepEqual(AppLocale.getRequestHeaders('ja-JP'), { 'X-Locale': 'en' });
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `window.AppLocale` does not yet expose `getRequestHeaders`.

- [ ] **Step 3: Add the request-header helper**

In `src/views/browser-locale-resources.js`, add this helper before the frozen runtime object:

```js
    function getRequestHeaders(locale) {
      const resolvedLocale = normalizeUiLocale(locale || getPreferredLocale());
      return { 'X-Locale': resolvedLocale };
    }
```

Then extend the frozen runtime surface to include it:

```js
      getRequestHeaders,
```

Place it between `getMessage` and `applyTranslations` in the exported object.

- [ ] **Step 4: Run runtime tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js
```

Expected: PASS.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 3: Localise shared API router/auth/config messages and propagate locale from login/config

**Files:**
- Modify: `src/api/router.js`
- Modify: `src/api/handlers/auth.js`
- Modify: `src/api/handlers/config.js`
- Modify: `src/views/loginPage.html`
- Modify: `src/views/configPage.html`

- [ ] **Step 1: Write the failing handler/browser tests first**

Append these tests to `tests/api/locale.test.js`:

```js
import { handleLogin } from '../../src/api/handlers/auth.js';
import { handleApiRequest } from '../../src/api/router.js';

function createEnv(overrides = {}) {
  return {
    SUBSCRIPTIONS_KV: {
      get: async () => null,
      put: async () => {}
    },
    ...overrides
  };
}

test('handleLogin returns localized invalid-credentials messages', async () => {
  const env = createEnv();
  const zhRequest = new Request('https://example.com/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Locale': 'zh-CN'
    },
    body: JSON.stringify({ username: 'wrong', password: 'wrong' })
  });
  const enRequest = new Request('https://example.com/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Locale': 'en-US'
    },
    body: JSON.stringify({ username: 'wrong', password: 'wrong' })
  });

  const zhResponse = await handleLogin(zhRequest, env);
  const enResponse = await handleLogin(enRequest, env);
  const zhBody = await zhResponse.json();
  const enBody = await enResponse.json();

  assert.equal(zhBody.message, '未授权访问');
  assert.equal(enBody.message, 'Unauthorized access');
});

test('handleApiRequest returns localized unauthorized messages', async () => {
  const env = createEnv();
  const zhRequest = new Request('https://example.com/api/config', {
    method: 'GET',
    headers: { 'X-Locale': 'zh-CN' }
  });
  const enRequest = new Request('https://example.com/api/config', {
    method: 'GET',
    headers: { 'X-Locale': 'en-US' }
  });

  const zhResponse = await handleApiRequest(zhRequest, env);
  const enResponse = await handleApiRequest(enRequest, env);
  const zhBody = await zhResponse.json();
  const enBody = await enResponse.json();

  assert.equal(zhResponse.status, 401);
  assert.equal(enResponse.status, 401);
  assert.equal(zhBody.message, '未授权访问');
  assert.equal(enBody.message, 'Unauthorized access');
});
```

Then fix the first expected zh/en strings so they actually match the intended localized login-invalid-credentials messages:

```js
  assert.equal(zhBody.message, '用户名或密码错误');
  assert.equal(enBody.message, 'Incorrect username or password');
```

Also append these page-level assertions to `tests/views/browser-ui-localisation.test.js`:

```js
test('browser runtime request headers are used in login/config fetch paths', () => {
  assert.equal(loginPageHtml.includes('window.AppLocale.getRequestHeaders('), true);
  assert.equal(configPageHtml.includes('window.AppLocale.getRequestHeaders('), true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --experimental-default-type=module --test tests/api/locale.test.js tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because the API handlers do not yet localize messages and the browser pages do not yet send locale headers.

- [ ] **Step 3: Localize router/auth/config messages and send locale headers from login/config**

In `src/api/router.js`:
- import `extractRequestLocale` and `getServerMessage` from `./locale.js`
- inside `handleApiRequest`, resolve `const locale = extractRequestLocale(request);`
- replace unauthorized/not-found hardcoded messages with:

```js
getServerMessage('api_unauthorized', locale)
getServerMessage('api_not_found', locale)
```

In `src/api/handlers/auth.js`:
- import `extractRequestLocale` and `getServerMessage` from `../locale.js`
- resolve locale from the request
- replace the hardcoded invalid-credentials message with:

```js
getServerMessage('login_invalid_credentials', locale)
```

In `src/api/handlers/config.js`:
- import `extractRequestLocale` and `getServerMessage` from `../locale.js`
- resolve locale from the request inside `handleUpdateConfig`
- change the error response to:

```js
JSON.stringify({ success: false, message: getServerMessage('config_update_failed_prefix', locale) + error.message })
```

In `src/views/loginPage.html`, update the fetch call to:

```js
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...window.AppLocale.getRequestHeaders(preferredLocale)
          },
          body: JSON.stringify({ username, password })
        });
```

In `src/views/configPage.html`, update browser-triggered API fetch calls (`/api/config`, `/api/test-notification`) to merge in:

```js
...window.AppLocale.getRequestHeaders(window.AppLocale.getPreferredLocale())
```

Do this for the save/test/config-loading fetches touched in this phase; do not refactor unrelated fetch wrappers yet.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/api/locale.test.js tests/views/browser-ui-localisation.test.js tests/core/locale.test.js
```

Expected: PASS.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 4: Localise test-notification/dashboard/subscription messages and propagate locale from admin/dashboard

**Files:**
- Modify: `src/api/handlers/dashboard.js`
- Modify: `src/api/handlers/subscriptions.js`
- Modify: `src/api/handlers/test-notification.js`
- Modify: `src/views/adminPage.html`
- Modify: `src/views/dashboardPage.html`
- Modify: `tests/api/locale.test.js`

- [ ] **Step 1: Write the failing handler tests first**

Append these tests to `tests/api/locale.test.js`:

```js
import { handleTestNotification } from '../../src/api/handlers/test-notification.js';

const configEnv = createEnv({
  SUBSCRIPTIONS_KV: {
    get: async (key) => {
      if (key === 'SYSTEM_CONFIG') {
        return JSON.stringify({
          ADMIN_USERNAME: 'admin',
          ADMIN_PASSWORD: 'password',
          JWT_SECRET: 'secret',
          TIMEZONE: 'UTC',
          ENABLED_NOTIFIERS: ['notifyx']
        });
      }
      return null;
    },
    put: async () => {}
  }
});

test('handleTestNotification returns localized missing-type messages', async () => {
  const zhRequest = new Request('https://example.com/api/test-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Locale': 'zh-CN'
    },
    body: JSON.stringify({})
  });
  const enRequest = new Request('https://example.com/api/test-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Locale': 'en-US'
    },
    body: JSON.stringify({})
  });

  const zhResponse = await handleTestNotification(zhRequest, configEnv);
  const enResponse = await handleTestNotification(enRequest, configEnv);
  const zhBody = await zhResponse.json();
  const enBody = await enResponse.json();

  assert.equal(zhBody.message, '缺少测试类型参数 type');
  assert.equal(enBody.message, 'Missing required test type parameter: type');
});
```

Also append these page-level assertions to `tests/views/browser-ui-localisation.test.js`:

```js
test('browser runtime request headers are used in admin/dashboard fetch paths', () => {
  assert.equal(adminPageHtml.includes('window.AppLocale.getRequestHeaders('), true);
  assert.equal(dashboardPageHtml.includes('window.AppLocale.getRequestHeaders('), true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --experimental-default-type=module --test tests/api/locale.test.js tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because those handlers/pages do not yet localize messages or send locale headers.

- [ ] **Step 3: Localize dashboard/subscription/test-notification handlers and send locale headers from admin/dashboard**

In `src/api/handlers/dashboard.js`:
- add `request` as the first parameter to `handleDashboardStats(request, env, config)`
- update `src/api/router.js` to call `handleDashboardStats(request, env, config)`
- localize the error message using `getServerMessage('dashboard_fetch_failed_prefix', locale) + error.message`

In `src/api/handlers/subscriptions.js`:
- import `extractRequestLocale` and `getServerMessage`
- resolve locale from `request` inside `handleSubscriptions` and pass it down to helper paths as needed
- replace the most common browser-visible hardcoded strings touched in browser-triggered actions:
  - `未找到该订阅`
  - `未找到测试按钮，请刷新页面后重试`
  - `订阅 ID 缺失，无法发送测试通知`
  - `获取订阅信息时发生错误`
  using the server-message catalog

In `src/api/handlers/test-notification.js`:
- import `extractRequestLocale` and `getServerMessage`
- resolve locale from request
- replace the hardcoded missing-type / unsupported-type / generic failure messages with server-message lookups

In `src/views/adminPage.html` and `src/views/dashboardPage.html`, update browser-triggered fetch calls to include:

```js
...window.AppLocale.getRequestHeaders(window.AppLocale.getPreferredLocale())
```

Do this for the fetches that read or surface localized `result.message` in this phase; avoid unrelated broad refactors.

- [ ] **Step 4: Run targeted regression tests**

Run:

```bash
node --experimental-default-type=module --test tests/api/locale.test.js tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js tests/views/currency-myr.test.js
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
- Shared server locale extraction and backend message lookup: covered by Task 1.
- Browser request-locale helper: covered by Task 2.
- Browser-triggered API message localisation in core handlers: covered by Tasks 3-4.
- Frontend local-only dynamic strings continue to use `window.AppLocale.getMessage()`: preserved by the current page runtime and targeted browser-page work.
- Background notification localisation remains deferred by explicit scope.

### Placeholder scan
- No placeholder markers remain.
- Every code-changing step includes exact code snippets.
- Every verification step includes a concrete command and expected outcome.

### Type consistency
- Server locale helpers consistently use `extractRequestLocale()` and `getServerMessage()`.
- Browser request propagation consistently uses `window.AppLocale.getRequestHeaders(...)`.
- Backend message keys consistently use `api_*`, `login_*`, `config_*`, `dashboard_*`, `test_notification_*`, and `subscription_*` prefixes.
