# Global Notification Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted global `NOTIFICATION_LOCALE` setting for background and outbound notification content, default it to English, and apply it to reminder/test-notification/email/Discord outbound messages while keeping browser-visible API messages on browser locale.

**Architecture:** Add one persisted config field (`NOTIFICATION_LOCALE`), create a dedicated outbound notification locale module separate from browser UI and API-response localization, then apply that locale to outbound content generation in reminder/test-notification/manual test notification/email/Discord flows. Browser-visible API `message` values remain on the existing browser-locale path.

**Tech Stack:** Cloudflare Workers ESM, KV-backed config, inline HTML templates, Node test runner (`node --experimental-default-type=module --test`)

**User preference:** Do **not** commit during execution. Leave changes uncommitted for user review.

---

## File Structure

### Create
- `src/services/notify/locale.js` — shared notification-locale normalization, lookup, and template interpolation for outbound/background content
- `tests/services/notify/locale.test.js` — unit tests for notification locale helpers

### Modify
- `src/data/config.js` — add `NOTIFICATION_LOCALE` default and normalization in config writes
- `src/api/handlers/config.js` — expose/persist `NOTIFICATION_LOCALE`
- `src/views/configPage.html` — add the notification-language select and save/load wiring
- `src/services/notify/reminder.js` — localize reminder body content using `NOTIFICATION_LOCALE`
- `src/api/handlers/test-notification.js` — keep browser-visible response messages on browser locale, but localize the sent notification title/body with `NOTIFICATION_LOCALE`
- `src/api/handlers/subscriptions.js` — localize manual test-notification outbound title/body with `NOTIFICATION_LOCALE`
- `src/services/notify/email.js` — localize email wrapper/footer boilerplate with `NOTIFICATION_LOCALE`
- `src/services/notify/discord.js` — localize Discord footer/title boilerplate where applicable with `NOTIFICATION_LOCALE`
- `tests/api/config-discord.test.js` — extend config persistence coverage to include `NOTIFICATION_LOCALE`
- `tests/api/test-notification-discord.test.js` — extend outbound test-notification content coverage to include `NOTIFICATION_LOCALE`
- `tests/services/notify/discord.test.js` — extend Discord presentation coverage if needed for footer/title text
- `tests/views/browser-ui-localisation.test.js` — add config page presence/wiring checks for the notification-locale field

### Leave unchanged in this phase
- browser UI locale detection rules
- browser-triggered API response message localization flow
- per-user/per-channel/per-subscription locale settings
- cron scheduler trigger timing logic

---

## New Config Field

Add one persisted field:

```txt
NOTIFICATION_LOCALE = zh | en
```

Rules:
- default missing value to `en`
- normalize invalid values back to `en`
- browser pages still use browser locale for UI text
- outbound/background content uses `NOTIFICATION_LOCALE`

---

### Task 1: Add persisted `NOTIFICATION_LOCALE` config support

**Files:**
- Modify: `src/data/config.js`
- Modify: `src/api/handlers/config.js`
- Modify: `tests/api/config-discord.test.js`

- [ ] **Step 1: Write the failing config persistence test**

Append this test to `tests/api/config-discord.test.js`:

```js
test('handleUpdateConfig persists NOTIFICATION_LOCALE and handleGetConfig returns it', async () => {
  const env = createEnv({
    JWT_SECRET: 'jwt-secret',
    ADMIN_USERNAME: 'admin',
    NOTIFICATION_LOCALE: 'en'
  });

  const updateRequest = new Request('https://example.test/api/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Locale': 'en-US'
    },
    body: JSON.stringify({
      ADMIN_USERNAME: 'admin',
      NOTIFICATION_LOCALE: 'zh',
      ENABLED_NOTIFIERS: ['discord']
    })
  });

  const updateResponse = await handleUpdateConfig(updateRequest, env);
  assert.equal(updateResponse.status, 200);

  const saved = JSON.parse(env.__store.get('config'));
  assert.equal(saved.NOTIFICATION_LOCALE, 'zh');

  const getResponse = await handleGetConfig(env);
  const json = await getResponse.json();
  assert.equal(json.NOTIFICATION_LOCALE, 'zh');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/api/config-discord.test.js
```

Expected: FAIL because `NOTIFICATION_LOCALE` is not persisted or returned yet.

- [ ] **Step 3: Add config default and normalization**

In `src/data/config.js`, add the new default field inside `DEFAULT_CONFIG`:

```js
  NOTIFICATION_LOCALE: 'en',
```

Place it near `TIMEZONE` and other notification-related defaults.

Also add this helper above `getConfig(env)`:

```js
function normalizeNotificationLocale(rawLocale) {
  if (typeof rawLocale !== 'string') return 'en';
  const locale = rawLocale.trim().toLowerCase();
  return locale === 'zh' ? 'zh' : 'en';
}
```

Then in `updateConfig(env, newConfig)`, include:

```js
    NOTIFICATION_LOCALE: normalizeNotificationLocale(newConfig.NOTIFICATION_LOCALE || config.NOTIFICATION_LOCALE || 'en'),
```

In `src/api/handlers/config.js`, ensure the update path also persists `NOTIFICATION_LOCALE` by adding:

```js
      NOTIFICATION_LOCALE: (newConfig.NOTIFICATION_LOCALE || config.NOTIFICATION_LOCALE || 'en').trim() === 'zh' ? 'zh' : 'en',
```

Place it near `TIMEZONE` and `ENABLED_NOTIFIERS` in `updatedConfig`.

- [ ] **Step 4: Run the config test to verify it passes**

Run:

```bash
node --experimental-default-type=module --test tests/api/config-discord.test.js
```

Expected: PASS.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 2: Add shared outbound notification locale helpers

**Files:**
- Create: `src/services/notify/locale.js`
- Create: `tests/services/notify/locale.test.js`

- [ ] **Step 1: Write the failing locale-helper test**

Create `tests/services/notify/locale.test.js` with this exact content:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeNotificationLocale,
  getNotificationLocale,
  getNotificationMessage,
  NOTIFICATION_MESSAGES
} from '../../../src/services/notify/locale.js';

test('normalizeNotificationLocale accepts zh/en and falls back to en', () => {
  assert.equal(normalizeNotificationLocale('zh'), 'zh');
  assert.equal(normalizeNotificationLocale('en'), 'en');
  assert.equal(normalizeNotificationLocale('ja'), 'en');
  assert.equal(normalizeNotificationLocale(undefined), 'en');
});

test('getNotificationLocale reads config and defaults to en', () => {
  assert.equal(getNotificationLocale({ NOTIFICATION_LOCALE: 'zh' }), 'zh');
  assert.equal(getNotificationLocale({ NOTIFICATION_LOCALE: 'en' }), 'en');
  assert.equal(getNotificationLocale({ NOTIFICATION_LOCALE: 'bad' }), 'en');
  assert.equal(getNotificationLocale({}), 'en');
});

test('getNotificationMessage returns localized text with interpolation', () => {
  assert.equal(getNotificationMessage('reminder_due_today', 'zh'), '今天到期！');
  assert.equal(getNotificationMessage('reminder_due_today', 'en'), 'Due today!');
  assert.equal(getNotificationMessage('reminder_due_in_days', 'zh', { days: 3 }), '将在 3 天后到期');
  assert.equal(getNotificationMessage('reminder_due_in_days', 'en', { days: 3 }), 'Due in 3 day(s)');
});

test('notification catalog exposes default locale strings', () => {
  assert.equal(NOTIFICATION_MESSAGES.zh.reminder_due_today, '今天到期！');
  assert.equal(NOTIFICATION_MESSAGES.en.reminder_due_today, 'Due today!');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/services/notify/locale.test.js
```

Expected: FAIL because `src/services/notify/locale.js` does not exist yet.

- [ ] **Step 3: Implement the notification locale helper module**

Create `src/services/notify/locale.js` with this exact content:

```js
const DEFAULT_NOTIFICATION_LOCALE = 'en';

const NOTIFICATION_MESSAGES = {
  zh: {
    reminder_due_today: '今天到期！',
    reminder_due_in_days: '将在 {days} 天后到期',
    reminder_expired_days: '已过期 {days} 天',
    reminder_strategy_days: '提醒策略: 提前 {value} 天{suffix}',
    reminder_strategy_hours: '提醒策略: 提前 {value} 小时{suffix}',
    reminder_suffix_due_only: '（仅到期时提醒）',
    reminder_suffix_hour_level: '（小时级提醒）',
    reminder_calendar_lunar: '农历',
    reminder_calendar_solar: '公历',
    reminder_auto_renew_yes: '是',
    reminder_auto_renew_no: '否',
    reminder_sent_at: '发送时间',
    reminder_current_timezone: '当前时区',
    notification_email_footer: '此邮件由订阅管理系统自动发送，请及时处理相关订阅事务。',
    notification_email_signature: '订阅管理系统',
    notification_test_title: '测试通知',
    notification_test_body_generic: '这是一条测试通知，用于验证 {service} 是否正常工作。',
    notification_service_discord: 'Discord Bot 私信功能',
    notification_service_email: '邮件通知功能'
  },
  en: {
    reminder_due_today: 'Due today!',
    reminder_due_in_days: 'Due in {days} day(s)',
    reminder_expired_days: 'Expired {days} day(s) ago',
    reminder_strategy_days: 'Reminder strategy: {value} day(s) in advance{suffix}',
    reminder_strategy_hours: 'Reminder strategy: {value} hour(s) in advance{suffix}',
    reminder_suffix_due_only: ' (only when due)',
    reminder_suffix_hour_level: ' (hour-level reminder)',
    reminder_calendar_lunar: 'Lunar',
    reminder_calendar_solar: 'Solar',
    reminder_auto_renew_yes: 'Yes',
    reminder_auto_renew_no: 'No',
    reminder_sent_at: 'Sent at',
    reminder_current_timezone: 'Current timezone',
    notification_email_footer: 'This email was sent automatically by Subscription Manager. Please review the related subscription soon.',
    notification_email_signature: 'Subscription Manager',
    notification_test_title: 'Test notification',
    notification_test_body_generic: 'This is a test notification used to verify that {service} is working correctly.',
    notification_service_discord: 'Discord Bot DM notifications',
    notification_service_email: 'email notifications'
  }
};

function normalizeNotificationLocale(rawLocale) {
  if (typeof rawLocale !== 'string') return DEFAULT_NOTIFICATION_LOCALE;
  const locale = rawLocale.trim().toLowerCase();
  return locale === 'zh' ? 'zh' : 'en';
}

function getNotificationLocale(config) {
  return normalizeNotificationLocale(config?.NOTIFICATION_LOCALE);
}

function interpolateTemplate(template, params = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

function getNotificationMessage(key, locale = DEFAULT_NOTIFICATION_LOCALE, params = {}) {
  const resolvedLocale = normalizeNotificationLocale(locale);
  const localizedMessages = NOTIFICATION_MESSAGES[resolvedLocale] || NOTIFICATION_MESSAGES[DEFAULT_NOTIFICATION_LOCALE] || {};
  const fallbackMessages = NOTIFICATION_MESSAGES[DEFAULT_NOTIFICATION_LOCALE] || {};
  const template = localizedMessages[key] || fallbackMessages[key] || key;
  return interpolateTemplate(template, params);
}

export {
  DEFAULT_NOTIFICATION_LOCALE,
  NOTIFICATION_MESSAGES,
  normalizeNotificationLocale,
  getNotificationLocale,
  getNotificationMessage,
  interpolateTemplate
};
```

- [ ] **Step 4: Run the helper tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/services/notify/locale.test.js
```

Expected: PASS.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 3: Add config-page UI for `NOTIFICATION_LOCALE`

**Files:**
- Modify: `src/views/configPage.html`
- Modify: `tests/views/browser-ui-localisation.test.js`

- [ ] **Step 1: Add a failing config-page regression test**

Append this test to `tests/views/browser-ui-localisation.test.js`:

```js
test('config page exposes notification locale setting', () => {
  assert.equal(configPageHtml.includes('id="notificationLocale"'), true);
  assert.equal(configPageHtml.includes('NOTIFICATION_LOCALE'), true);
  assert.equal(configPageHtml.includes('<option value="zh">'), true);
  assert.equal(configPageHtml.includes('<option value="en">'), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because the config page does not expose the field yet.

- [ ] **Step 3: Add the config field and wiring**

In `src/views/configPage.html`, add this block near the other notification settings:

```html
<div class="mb-6">
  <label for="notificationLocale" class="block text-sm font-medium text-gray-700">Notification Language</label>
  <select id="notificationLocale" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
    <option value="zh">中文</option>
    <option value="en">English</option>
  </select>
  <p class="mt-1 text-sm text-gray-500">This setting controls the language used in reminder emails, Discord DMs, and other outbound notifications.</p>
</div>
```

Then update config load/save wiring in the same file:

- when loading config, set:

```js
document.getElementById('notificationLocale').value = config.NOTIFICATION_LOCALE || 'en';
```

- when building the outgoing config object, add:

```js
NOTIFICATION_LOCALE: document.getElementById('notificationLocale').value.trim(),
```

- [ ] **Step 4: Run the config-page regression test to verify it passes**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: PASS.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 4: Apply `NOTIFICATION_LOCALE` to reminder, test-notification outbound content, email, and Discord

**Files:**
- Modify: `src/services/notify/reminder.js`
- Modify: `src/api/handlers/test-notification.js`
- Modify: `src/api/handlers/subscriptions.js`
- Modify: `src/services/notify/email.js`
- Modify: `src/services/notify/discord.js`
- Modify: `tests/api/test-notification-discord.test.js`
- Modify: `tests/services/notify/discord.test.js`

- [ ] **Step 1: Write failing outbound-content tests first**

Append this test to `tests/api/test-notification-discord.test.js`:

```js
test('Discord test-notification outbound content uses NOTIFICATION_LOCALE rather than browser locale', async (t) => {
  const env = createEnv({
    JWT_SECRET: 'jwt-secret',
    TIMEZONE: 'America/New_York',
    NOTIFICATION_LOCALE: 'zh',
    DISCORD_BOT_TOKEN: 'saved-token',
    DISCORD_USER_ID: 'saved-user'
  });

  const calls = [];
  const originalFetch = global.fetch;
  const originalDate = global.Date;

  global.Date = FixedDate;
  global.fetch = async (url, init) => {
    calls.push({ url, body: init?.body ?? '' });

    if (url === 'https://discord.com/api/v10/users/@me/channels') {
      return { ok: true, json: async () => ({ id: 'dm-channel-id' }), text: async () => '' };
    }
    if (url === 'https://discord.com/api/v10/channels/dm-channel-id/messages') {
      return { ok: true, json: async () => ({ id: 'message-id' }), text: async () => '' };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  t.after(() => {
    global.fetch = originalFetch;
    global.Date = originalDate;
  });

  const request = new Request('https://example.test/api/test-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Locale': 'en-US'
    },
    body: JSON.stringify({ type: 'discord' })
  });

  const response = await handleTestNotification(request, env);
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.success, true);
  const payload = JSON.parse(calls[1].body);
  assert.match(payload.embeds[0].description, /这是一条测试通知/);
});
```

Append this test to `tests/services/notify/discord.test.js`:

```js
test('Discord footer uses localized notification signature when provided in config', async (t) => {
  const calls = [];
  const originalFetch = global.fetch;

  global.fetch = async (url, init) => {
    calls.push({ url, body: init?.body ?? '' });
    if (url === 'https://discord.com/api/v10/users/@me/channels') {
      return { ok: true, json: async () => ({ id: 'dm-channel-id' }), text: async () => '' };
    }
    if (url === 'https://discord.com/api/v10/channels/dm-channel-id/messages') {
      return { ok: true, json: async () => ({ id: 'message-id' }), text: async () => '' };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  await sendDiscordNotification('Reminder', 'Localized body', {
    ENABLED_NOTIFIERS: ['discord'],
    DISCORD_BOT_TOKEN: 'bot-token',
    DISCORD_USER_ID: 'user-1',
    NOTIFICATION_SIGNATURE: '订阅管理系统'
  });

  const payload = JSON.parse(calls[1].body);
  assert.equal(payload.embeds[0].footer.text, '订阅管理系统');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --experimental-default-type=module --test tests/api/test-notification-discord.test.js tests/services/notify/discord.test.js
```

Expected: FAIL because outbound content is not yet driven by `NOTIFICATION_LOCALE`.

- [ ] **Step 3: Localize outbound notification content**

In `src/services/notify/reminder.js`:
- import `getNotificationLocale` and `getNotificationMessage` from `./locale.js`
- resolve `const notificationLocale = getNotificationLocale(config);`
- replace the hardcoded Chinese status / reminder / footer strings in `formatNotificationContent(...)` with `getNotificationMessage(...)`
- keep existing date/time formatting and lunar calculations intact

In `src/api/handlers/test-notification.js`:
- import `getNotificationLocale` and `getNotificationMessage` from `../../services/notify/locale.js`
- resolve `const notificationLocale = getNotificationLocale(config);`
- localize outbound test-notification title/body content, while keeping browser-visible `message` on browser locale

In `src/api/handlers/subscriptions.js`:
- import `getNotificationLocale` and `getNotificationMessage` from `../../services/notify/locale.js`
- localize the manual test-notification title/content body with `NOTIFICATION_LOCALE`

In `src/services/notify/email.js`:
- import `getNotificationLocale` and `getNotificationMessage`
- resolve locale from config
- localize footer boilerplate and signature text with notification locale

In `src/services/notify/discord.js`:
- use a config-provided localized signature/label where available
- keep the change minimal and focused on outbound localized wrapper/footer text

- [ ] **Step 4: Run targeted regression tests**

Run:

```bash
node --experimental-default-type=module --test tests/api/config-discord.test.js tests/api/test-notification-discord.test.js tests/services/notify/discord.test.js tests/services/notify/locale.test.js tests/views/browser-ui-localisation.test.js
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
- persisted `NOTIFICATION_LOCALE` config field: covered by Tasks 1 and 3.
- default English notification locale: reflected in config and helper defaults.
- outbound notification locale helpers/catalog: covered by Task 2.
- reminder/test-notification/email/Discord outbound content localization: covered by Task 4.
- browser-visible API messages remain browser-locale based: preserved by the existing browser-initiated dynamic messaging layer.

### Placeholder scan
- No placeholder markers remain.
- Every code-changing step includes exact code snippets.
- Every verification step includes a concrete command and expected outcome.

### Type consistency
- persisted config field is consistently named `NOTIFICATION_LOCALE`.
- outbound helper names consistently use `getNotificationLocale()` and `getNotificationMessage()`.
- browser-visible result messages and outbound content are kept explicitly separate.
