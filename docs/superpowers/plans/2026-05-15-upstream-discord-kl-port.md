# Upstream Discord + Kuala Lumpur Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the local Discord notifier and Kuala Lumpur timezone customizations onto `upstream/master` without weakening upstream V2 config security or touching the user’s current branch.

**Architecture:** Add a new `src/services/notify/discord.js` module, extend the existing config/test-notification/dispatcher flows to recognize Discord, and add a lightweight Node test harness using `node --experimental-default-type=module --test` so the current ESM-style source can be tested without converting the whole repo to package-wide ESM. For timezone support, extend shared timezone maps and curated UI lists instead of hardcoding replacements into legacy helpers.

**Tech Stack:** Cloudflare Workers JavaScript, Node built-in test runner, npm, git, PowerShell

---

## File Structure

**Create**

- `tests/core/time.test.js`
- `tests/api/config-discord.test.js`
- `tests/services/notify/discord.test.js`
- `tests/api/test-notification-discord.test.js`
- `tests/views/config-page-discord.test.js`
- `src/services/notify/discord.js`

**Modify**

- `package.json`
- `src/core/time.js`
- `src/data/config.js`
- `src/api/handlers/config.js`
- `src/api/handlers/test-notification.js`
- `src/services/notify/index.js`
- `src/views/configPage.html`
- `src/views/adminPage.html`

---

### Task 1: Add the test harness and port Kuala Lumpur timezone labels

**Files:**
- Create: `tests/core/time.test.js`
- Modify: `package.json`
- Modify: `src/core/time.js`
- Modify: `src/views/configPage.html`
- Modify: `src/views/adminPage.html`

- [ ] **Step 1: Write the failing test**

Update `package.json` to add a test script without changing package-wide module mode:

```json
{
  "name": "subscription-manager",
  "version": "2.0.0",
  "description": "订阅管理系统 - 基于CloudFlare Workers",
  "main": "src/index.js",
  "scripts": {
    "build": "echo 'No build step required for Workers runtime'",
    "setup": "node scripts/setup-kv.js",
    "deploy": "npx wrangler deploy --env=\"\"",
    "deploy:safe": "npm run setup && npm run deploy",
    "test": "node --experimental-default-type=module --test"
  },
  "keywords": [
    "cloudflare-workers",
    "subscription-management",
    "notification",
    "lunar-calendar"
  ],
  "license": "MIT"
}
```

Create `tests/core/time.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatTimezoneDisplay } from '../../src/core/time.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const configPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/configPage.html'), 'utf8');
const adminPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/adminPage.html'), 'utf8');

test('formatTimezoneDisplay labels Kuala Lumpur with UTC+8', () => {
  assert.equal(formatTimezoneDisplay('Asia/Kuala_Lumpur'), '吉隆坡时间 (UTC+8)');
});

test('config page exposes Kuala Lumpur in the static timezone select', () => {
  assert.match(
    configPageHtml,
    /<option value="Asia\/Kuala_Lumpur">吉隆坡时间（UTC\+8）<\/option>/
  );
});

test('config page exposes Kuala Lumpur in the generated timezone options', () => {
  assert.match(
    configPageHtml,
    /\{ value: 'Asia\/Kuala_Lumpur', name: '吉隆坡时间', offset: '\+8' \}/
  );
});

test('admin page timezone name map includes Kuala Lumpur', () => {
  assert.match(
    adminPageHtml,
    /'Asia\/Kuala_Lumpur': '吉隆坡时间'/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/core/time.test.js
```

Expected: FAIL with an assertion similar to:

```text
Expected values to be strictly equal:
+ actual - expected
+ 'Asia/Kuala_Lumpur (UTC+8)'
- '吉隆坡时间 (UTC+8)'
```

and at least one missing HTML match for the Kuala Lumpur option.

- [ ] **Step 3: Write minimal implementation**

Update the timezone display-name map in `src/core/time.js`:

```js
    const timezoneNames = {
      'UTC': '世界标准时间',
      'Asia/Shanghai': '中国标准时间',
      'Asia/Hong_Kong': '香港时间',
      'Asia/Taipei': '台北时间',
      'Asia/Singapore': '新加坡时间',
      'Asia/Kuala_Lumpur': '吉隆坡时间',
      'Asia/Tokyo': '日本时间',
      'Asia/Seoul': '韩国时间',
      'America/New_York': '美国东部时间',
      'America/Los_Angeles': '美国太平洋时间',
      'America/Chicago': '美国中部时间',
      'America/Denver': '美国山地时间',
      'Europe/London': '英国时间',
      'Europe/Paris': '巴黎时间',
      'Europe/Berlin': '柏林时间',
      'Europe/Moscow': '莫斯科时间',
      'Australia/Sydney': '悉尼时间',
      'Australia/Melbourne': '墨尔本时间',
      'Pacific/Auckland': '奥克兰时间'
    };
```

Add the static config-page option in `src/views/configPage.html` immediately after Singapore:

```html
            <option value="Asia/Singapore">新加坡时间（UTC+8）</option>
            <option value="Asia/Kuala_Lumpur">吉隆坡时间（UTC+8）</option>
            <option value="Asia/Tokyo">日本时间（UTC+9）</option>
```

Add the generated config-page option in `src/views/configPage.html`:

```js
      const timezones = [
        { value: 'UTC', name: '世界标准时间', offset: '+0' },
        { value: 'Asia/Shanghai', name: '中国标准时间', offset: '+8' },
        { value: 'Asia/Hong_Kong', name: '香港时间', offset: '+8' },
        { value: 'Asia/Taipei', name: '台北时间', offset: '+8' },
        { value: 'Asia/Singapore', name: '新加坡时间', offset: '+8' },
        { value: 'Asia/Kuala_Lumpur', name: '吉隆坡时间', offset: '+8' },
        { value: 'Asia/Tokyo', name: '日本时间', offset: '+9' },
        { value: 'Asia/Seoul', name: '韩国时间', offset: '+9' },
        { value: 'America/New_York', name: '美国东部时间', offset: '-5' },
        { value: 'America/Chicago', name: '美国中部时间', offset: '-6' },
        { value: 'America/Denver', name: '美国山地时间', offset: '-7' },
        { value: 'America/Los_Angeles', name: '美国太平洋时间', offset: '-8' },
        { value: 'Europe/London', name: '英国时间', offset: '+0' },
        { value: 'Europe/Paris', name: '巴黎时间', offset: '+1' },
        { value: 'Europe/Berlin', name: '柏林时间', offset: '+1' },
        { value: 'Europe/Moscow', name: '莫斯科时间', offset: '+3' },
        { value: 'Australia/Sydney', name: '悉尼时间', offset: '+10' },
        { value: 'Australia/Melbourne', name: '墨尔本时间', offset: '+10' },
        { value: 'Pacific/Auckland', name: '奥克兰时间', offset: '+12' }
      ];
```

Add the frontend admin-page display-name entry in `src/views/adminPage.html`:

```js
            const timezoneNames = {
              'UTC': '世界标准时间',
              'Asia/Shanghai': '中国标准时间',
              'Asia/Hong_Kong': '香港时间',
              'Asia/Taipei': '台北时间',
              'Asia/Singapore': '新加坡时间',
              'Asia/Kuala_Lumpur': '吉隆坡时间',
              'Asia/Tokyo': '日本时间',
              'Asia/Seoul': '韩国时间',
              'America/New_York': '美国东部时间',
              'America/Los_Angeles': '美国太平洋时间',
              'America/Chicago': '美国中部时间',
              'America/Denver': '美国山地时间',
              'Europe/London': '英国时间',
              'Europe/Paris': '巴黎时间',
              'Europe/Berlin': '柏林时间',
              'Europe/Moscow': '莫斯科时间',
              'Australia/Sydney': '悉尼时间',
              'Australia/Melbourne': '墨尔本时间',
              'Pacific/Auckland': '奥克兰时间'
            };
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/core/time.test.js
```

Expected: PASS with all four tests green and exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add package.json tests/core/time.test.js src/core/time.js src/views/configPage.html src/views/adminPage.html
git commit -m "feat: add kuala lumpur timezone labels"
```

### Task 2: Add Discord config defaults and secret-masking coverage

**Files:**
- Create: `tests/api/config-discord.test.js`
- Modify: `src/data/config.js`
- Modify: `src/api/handlers/config.js`

- [ ] **Step 1: Write the failing test**

Create `tests/api/config-discord.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { handleGetConfig, handleUpdateConfig } from '../../src/api/handlers/config.js';

function createEnv(initialConfig = {}) {
  const store = new Map([
    ['config', JSON.stringify(initialConfig)]
  ]);

  return {
    SUBSCRIPTIONS_KV: {
      get: async (key) => store.get(key) ?? null,
      put: async (key, value) => {
        store.set(key, value);
      }
    },
    __store: store
  };
}

test('handleGetConfig masks Discord bot token and keeps Discord user id visible', async () => {
  const env = createEnv({
    JWT_SECRET: 'jwt-secret',
    DISCORD_BOT_TOKEN: 'discord-secret',
    DISCORD_USER_ID: '123456789'
  });

  const response = await handleGetConfig(env);
  const json = await response.json();

  assert.equal(json.DISCORD_BOT_TOKEN, '');
  assert.equal(json.DISCORD_BOT_TOKEN_CONFIGURED, true);
  assert.equal(json.DISCORD_USER_ID, '123456789');
});

test('handleUpdateConfig preserves or clears Discord bot token using the same rules as other secrets', async () => {
  const env = createEnv({
    JWT_SECRET: 'jwt-secret',
    ADMIN_USERNAME: 'admin',
    DISCORD_BOT_TOKEN: 'saved-token',
    DISCORD_USER_ID: 'old-user'
  });

  const keepRequest = new Request('https://example.test/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ADMIN_USERNAME: 'admin',
      DISCORD_BOT_TOKEN: '',
      DISCORD_USER_ID: 'new-user',
      ENABLED_NOTIFIERS: ['discord']
    })
  });

  const keepResponse = await handleUpdateConfig(keepRequest, env);
  assert.equal(keepResponse.status, 200);

  let saved = JSON.parse(env.__store.get('config'));
  assert.equal(saved.DISCORD_BOT_TOKEN, 'saved-token');
  assert.equal(saved.DISCORD_USER_ID, 'new-user');

  const clearRequest = new Request('https://example.test/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ADMIN_USERNAME: 'admin',
      DISCORD_USER_ID: 'cleared-user',
      CLEAR_SECRET_FIELDS: ['DISCORD_BOT_TOKEN'],
      ENABLED_NOTIFIERS: ['discord']
    })
  });

  const clearResponse = await handleUpdateConfig(clearRequest, env);
  assert.equal(clearResponse.status, 200);

  saved = JSON.parse(env.__store.get('config'));
  assert.equal(saved.DISCORD_BOT_TOKEN, '');
  assert.equal(saved.DISCORD_USER_ID, 'cleared-user');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/api/config-discord.test.js
```

Expected: FAIL because `DISCORD_BOT_TOKEN_CONFIGURED` is currently missing and/or `handleUpdateConfig` does not persist Discord-specific fields.

- [ ] **Step 3: Write minimal implementation**

Add Discord defaults to `src/data/config.js`:

```js
const DEFAULT_CONFIG = {
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'password',
  TG_BOT_TOKEN: '',
  TG_CHAT_ID: '',
  NOTIFYX_API_KEY: '',
  WEBHOOK_URL: '',
  WEBHOOK_METHOD: 'POST',
  WEBHOOK_HEADERS: '',
  WEBHOOK_TEMPLATE: '',
  SHOW_LUNAR: false,
  WECHATBOT_WEBHOOK: '',
  WECHATBOT_MSG_TYPE: 'text',
  WECHATBOT_AT_MOBILES: '',
  WECHATBOT_AT_ALL: 'false',
  RESEND_API_KEY: '',
  EMAIL_FROM: '',
  EMAIL_FROM_NAME: '订阅提醒系统',
  EMAIL_TO: '',
  BARK_DEVICE_KEY: '',
  BARK_SERVER: 'https://api.day.app',
  BARK_IS_ARCHIVE: 'false',
  DISCORD_BOT_TOKEN: '',
  DISCORD_USER_ID: '',
  ENABLED_NOTIFIERS: ['notifyx'],
  THEME_MODE: 'system',
  TIMEZONE: 'UTC',
  NOTIFICATION_HOURS: [],
  THIRD_PARTY_API_TOKEN: '',
  DEBUG_LOGS: false,
  PAYMENT_HISTORY_LIMIT: 100,
  GOTIFY_SERVER_URL: '',
  GOTIFY_APP_TOKEN: '',
  SERVERCHAN_SENDKEY: '',
  PUSHPLUS_TOKEN: '',
  PUSHPLUS_TOPIC: '',
  PUSHPLUS_CHANNEL: ''
};
```

Add Discord token masking and persistence to `src/api/handlers/config.js`:

```js
const SECRET_FIELDS = [
  'TG_BOT_TOKEN',
  'NOTIFYX_API_KEY',
  'WEBHOOK_URL',
  'WEBHOOK_HEADERS',
  'WECHATBOT_WEBHOOK',
  'RESEND_API_KEY',
  'BARK_DEVICE_KEY',
  'THIRD_PARTY_API_TOKEN',
  'GOTIFY_APP_TOKEN',
  'SERVERCHAN_SENDKEY',
  'PUSHPLUS_TOKEN',
  'DISCORD_BOT_TOKEN'
];
```

```js
    const updatedConfig = {
      ...config,
      ADMIN_USERNAME: newConfig.ADMIN_USERNAME || config.ADMIN_USERNAME,
      THEME_MODE: newConfig.THEME_MODE || 'system',

      TG_BOT_TOKEN: mergeSecretField(config, newConfig, 'TG_BOT_TOKEN', clearSecretFields),
      TG_CHAT_ID: newConfig.TG_CHAT_ID || '',

      NOTIFYX_API_KEY: mergeSecretField(config, newConfig, 'NOTIFYX_API_KEY', clearSecretFields),

      WEBHOOK_URL: mergeSecretField(config, newConfig, 'WEBHOOK_URL', clearSecretFields),
      WEBHOOK_METHOD: newConfig.WEBHOOK_METHOD || 'POST',
      WEBHOOK_HEADERS: mergeSecretField(config, newConfig, 'WEBHOOK_HEADERS', clearSecretFields),
      WEBHOOK_TEMPLATE: newConfig.WEBHOOK_TEMPLATE || '',

      SHOW_LUNAR: newConfig.SHOW_LUNAR === true,

      WECHATBOT_WEBHOOK: mergeSecretField(config, newConfig, 'WECHATBOT_WEBHOOK', clearSecretFields),
      WECHATBOT_MSG_TYPE: newConfig.WECHATBOT_MSG_TYPE || 'text',
      WECHATBOT_AT_MOBILES: newConfig.WECHATBOT_AT_MOBILES || '',
      WECHATBOT_AT_ALL: newConfig.WECHATBOT_AT_ALL || 'false',

      RESEND_API_KEY: mergeSecretField(config, newConfig, 'RESEND_API_KEY', clearSecretFields),
      EMAIL_FROM: newConfig.EMAIL_FROM || '',
      EMAIL_FROM_NAME: newConfig.EMAIL_FROM_NAME || '',
      EMAIL_TO: newConfig.EMAIL_TO || '',

      BARK_DEVICE_KEY: mergeSecretField(config, newConfig, 'BARK_DEVICE_KEY', clearSecretFields),
      BARK_SERVER: newConfig.BARK_SERVER || 'https://api.day.app',
      BARK_IS_ARCHIVE: newConfig.BARK_IS_ARCHIVE || 'false',

      GOTIFY_SERVER_URL: (newConfig.GOTIFY_SERVER_URL || '').trim(),
      GOTIFY_APP_TOKEN: mergeSecretField(config, newConfig, 'GOTIFY_APP_TOKEN', clearSecretFields),

      SERVERCHAN_SENDKEY: mergeSecretField(config, newConfig, 'SERVERCHAN_SENDKEY', clearSecretFields),

      PUSHPLUS_TOKEN: mergeSecretField(config, newConfig, 'PUSHPLUS_TOKEN', clearSecretFields),
      PUSHPLUS_TOPIC: (newConfig.PUSHPLUS_TOPIC || '').trim(),
      PUSHPLUS_CHANNEL: (newConfig.PUSHPLUS_CHANNEL || '').trim(),

      DISCORD_BOT_TOKEN: mergeSecretField(config, newConfig, 'DISCORD_BOT_TOKEN', clearSecretFields),
      DISCORD_USER_ID: (newConfig.DISCORD_USER_ID || '').trim(),

      ENABLED_NOTIFIERS: newConfig.ENABLED_NOTIFIERS || ['notifyx'],
      TIMEZONE: newConfig.TIMEZONE || config.TIMEZONE || 'UTC',

      THIRD_PARTY_API_TOKEN: mergeSecretField(config, newConfig, 'THIRD_PARTY_API_TOKEN', clearSecretFields),

      DEBUG_LOGS: newConfig.DEBUG_LOGS === true,
      PAYMENT_HISTORY_LIMIT: Number.isFinite(Number(newConfig.PAYMENT_HISTORY_LIMIT))
        ? Math.min(1000, Math.max(10, Math.floor(Number(newConfig.PAYMENT_HISTORY_LIMIT))))
        : (config.PAYMENT_HISTORY_LIMIT || 100)
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/api/config-discord.test.js
```

Expected: PASS with both Discord config tests green and exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add tests/api/config-discord.test.js src/data/config.js src/api/handlers/config.js
git commit -m "feat: add secure discord config support"
```

### Task 3: Add the Discord notifier, dispatcher wiring, and timezone-aware test-notification handler

**Files:**
- Create: `src/services/notify/discord.js`
- Create: `tests/services/notify/discord.test.js`
- Create: `tests/api/test-notification-discord.test.js`
- Modify: `src/services/notify/index.js`
- Modify: `src/api/handlers/test-notification.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/services/notify/discord.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { sendNotificationToAllChannels } from '../../../src/services/notify/index.js';

test('dispatcher sends Discord DMs through the Discord API flow', async (t) => {
  const calls = [];
  const originalFetch = global.fetch;

  global.fetch = async (url, init) => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ?? ''
    });

    if (url === 'https://discord.com/api/v10/users/@me/channels') {
      return {
        ok: true,
        json: async () => ({ id: 'dm-channel-id' }),
        text: async () => ''
      };
    }

    if (url === 'https://discord.com/api/v10/channels/dm-channel-id/messages') {
      return {
        ok: true,
        json: async () => ({ id: 'message-id' }),
        text: async () => ''
      };
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await sendNotificationToAllChannels(
    'Billing reminder',
    '**Renew soon**',
    {
      ENABLED_NOTIFIERS: ['discord'],
      DISCORD_BOT_TOKEN: 'bot-token',
      DISCORD_USER_ID: 'user-1'
    },
    '[test]'
  );

  assert.equal(result.attempted, 1);
  assert.equal(result.successCount, 1);
  assert.equal(result.failedCount, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://discord.com/api/v10/users/@me/channels');
  assert.equal(calls[1].url, 'https://discord.com/api/v10/channels/dm-channel-id/messages');

  const payload = JSON.parse(calls[1].body);
  assert.equal(payload.embeds[0].title, '🔔 Billing reminder');
  assert.match(payload.embeds[0].description, /Renew soon/);
});
```

Create `tests/api/test-notification-discord.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { handleTestNotification } from '../../src/api/handlers/test-notification.js';

function createEnv(initialConfig = {}) {
  const store = new Map([
    ['config', JSON.stringify(initialConfig)]
  ]);

  return {
    SUBSCRIPTIONS_KV: {
      get: async (key) => store.get(key) ?? null,
      put: async (key, value) => {
        store.set(key, value);
      }
    }
  };
}

const RealDate = Date;
const fixedNowIso = '2026-05-15T00:30:45.000Z';

class FixedDate extends RealDate {
  constructor(...args) {
    super(args.length === 0 ? fixedNowIso : args[0]);
  }

  static now() {
    return new RealDate(fixedNowIso).getTime();
  }

  static parse(value) {
    return RealDate.parse(value);
  }

  static UTC(...args) {
    return RealDate.UTC(...args);
  }
}

test('Discord test notifications are supported and format timestamps with config.TIMEZONE', async (t) => {
  const env = createEnv({
    JWT_SECRET: 'jwt-secret',
    TIMEZONE: 'America/New_York',
    DISCORD_BOT_TOKEN: 'saved-token',
    DISCORD_USER_ID: 'saved-user'
  });

  const calls = [];
  const originalFetch = global.fetch;
  const originalDate = global.Date;

  global.Date = FixedDate;
  global.fetch = async (url, init) => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ?? ''
    });

    if (url === 'https://discord.com/api/v10/users/@me/channels') {
      return {
        ok: true,
        json: async () => ({ id: 'dm-channel-id' }),
        text: async () => ''
      };
    }

    if (url === 'https://discord.com/api/v10/channels/dm-channel-id/messages') {
      return {
        ok: true,
        json: async () => ({ id: 'message-id' }),
        text: async () => ''
      };
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  t.after(() => {
    global.fetch = originalFetch;
    global.Date = originalDate;
  });

  const request = new Request('https://example.test/api/test-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'discord' })
  });

  const response = await handleTestNotification(request, env);
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.success, true);
  assert.equal(calls.length, 2);

  const payload = JSON.parse(calls[1].body);
  assert.match(payload.embeds[0].description, /2026\/05\/14/);
  assert.match(payload.embeds[0].description, /20:30:45/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/services/notify/discord.test.js tests/api/test-notification-discord.test.js
```

Expected: FAIL because:

- `sendNotificationToAllChannels` does not yet count or send `discord`
- `handleTestNotification` currently rejects `type === 'discord'`

- [ ] **Step 3: Write minimal implementation**

Create `src/services/notify/discord.js`:

```js
async function sendDiscordNotification(title, content, config) {
  try {
    const botToken = (config.DISCORD_BOT_TOKEN || '').trim();
    const userId = (config.DISCORD_USER_ID || '').trim();

    if (!botToken || !userId) {
      console.error('[Discord Bot] 通知未配置，缺少 Bot Token 或 User ID');
      return false;
    }

    const apiBase = 'https://discord.com/api/v10';

    const dmChannelResponse = await fetch(`${apiBase}/users/@me/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_id: userId
      })
    });

    if (!dmChannelResponse.ok) {
      const text = await dmChannelResponse.text().catch(() => '');
      console.error('[Discord Bot] 创建 DM 频道失败:', dmChannelResponse.status, text);
      return false;
    }

    const dmChannel = await dmChannelResponse.json();
    const description = String(content || '').replace(/(\*\*|`|#+\s)/g, '');

    const messageResponse = await fetch(`${apiBase}/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [
          {
            title: `🔔 ${title}`,
            description,
            color: 5814783,
            timestamp: new Date().toISOString(),
            footer: {
              text: '订阅管理系统'
            }
          }
        ]
      })
    });

    if (!messageResponse.ok) {
      const text = await messageResponse.text().catch(() => '');
      console.error('[Discord Bot] 发送 DM 失败:', messageResponse.status, text);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Discord Bot] 发送失败:', error);
    return false;
  }
}

export { sendDiscordNotification };
```

Update `src/services/notify/index.js`:

```js
import { sendNotifyXNotification } from './notifyx.js';
import { sendTelegramNotification } from './telegram.js';
import { sendWebhookNotification } from './webhook.js';
import { sendWechatBotNotification } from './wechat.js';
import { sendEmailNotification } from './email.js';
import { sendBarkNotification } from './bark.js';
import { sendGotifyNotification } from './gotify.js';
import { sendServerChanNotification } from './serverchan.js';
import { sendPushPlusNotification } from './pushplus.js';
import { sendDiscordNotification } from './discord.js';
```

```js
  if (enabledNotifiers.includes('discord')) {
    result.attempted += 1;
    const success = await sendDiscordNotification(title, commonContent, config);
    result.channelResults.discord = success;
    success ? result.successCount++ : result.failedCount++;
    console.log(`${logPrefix} 发送Discord私信通知 ${success ? '成功' : '失败'}`);
  }
```

Update `src/api/handlers/test-notification.js` to import the generic formatter and Discord sender:

```js
import { getConfig } from '../../data/config.js';
import { formatTimeInTimezone } from '../../core/time.js';
import { sendTelegramNotification } from '../../services/notify/telegram.js';
import { sendNotifyXNotification } from '../../services/notify/notifyx.js';
import { sendWebhookNotification } from '../../services/notify/webhook.js';
import { sendWechatBotNotification } from '../../services/notify/wechat.js';
import { sendEmailNotification } from '../../services/notify/email.js';
import { sendBarkNotification } from '../../services/notify/bark.js';
import { sendGotifyNotification } from '../../services/notify/gotify.js';
import { sendServerChanNotification } from '../../services/notify/serverchan.js';
import { sendPushPlusNotification } from '../../services/notify/pushplus.js';
import { sendDiscordNotification } from '../../services/notify/discord.js';
```

At the top of `handleTestNotification`, add a shared timestamp and extend the supported types:

```js
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const sentAt = formatTimeInTimezone(new Date(), config?.TIMEZONE || 'UTC', 'datetime');
    const supportedTypes = ['telegram', 'notifyx', 'webhook', 'wechatbot', 'email', 'bark', 'gotify', 'serverchan', 'pushplus', 'discord'];
```

Replace each hardcoded `formatBeijingTime()` call with `sentAt`, for example:

```js
      const content = '*测试通知*\n\n这是一条测试通知，用于验证Telegram通知功能是否正常工作。\n\n发送时间: ' + sentAt;
```

and:

```js
      const content = '这是一条测试通知，用于验证PushPlus通知功能是否正常工作。\n\n发送时间: ' + sentAt;
```

Add the Discord handler branch:

```js
    } else if (type === 'discord') {
      const testConfig = {
        ...config,
        DISCORD_BOT_TOKEN: (typeof body.DISCORD_BOT_TOKEN === 'string' && body.DISCORD_BOT_TOKEN.trim().length > 0)
          ? body.DISCORD_BOT_TOKEN.trim()
          : config.DISCORD_BOT_TOKEN,
        DISCORD_USER_ID: (typeof body.DISCORD_USER_ID === 'string' && body.DISCORD_USER_ID.trim().length > 0)
          ? body.DISCORD_USER_ID.trim()
          : config.DISCORD_USER_ID
      };

      const title = '测试通知';
      const content = '这是一条测试通知，用于验证 Discord Bot 私信功能是否正常工作。\n\n发送时间: ' + sentAt;

      success = await sendDiscordNotification('Discord 私信测试通知', content, testConfig);
      message = success ? 'Discord 私信发送成功' : 'Discord 私信发送失败，请检查配置和服务器设置';
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- tests/services/notify/discord.test.js tests/api/test-notification-discord.test.js
```

Expected: PASS with both files green and exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add src/services/notify/discord.js src/services/notify/index.js src/api/handlers/test-notification.js tests/services/notify/discord.test.js tests/api/test-notification-discord.test.js
git commit -m "feat: add discord notifier support"
```

### Task 4: Add Discord controls to the config page with static regression coverage

**Files:**
- Create: `tests/views/config-page-discord.test.js`
- Modify: `src/views/configPage.html`

- [ ] **Step 1: Write the failing test**

Create `tests/views/config-page-discord.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(repoRoot, 'src/views/configPage.html'), 'utf8');

test('config page exposes the Discord notifier option and config section', () => {
  assert.match(html, /value="discord"/);
  assert.match(html, /id="discordConfig"/);
  assert.match(html, /id="discordBotToken"/);
  assert.match(html, /id="discordUserId"/);
  assert.match(html, /id="testDiscordBtn"/);
});

test('config page treats the Discord bot token as a masked secret field', () => {
  assert.match(html, /id="clearDiscordBotToken"/);
  assert.match(html, /id="DISCORD_BOT_TOKENStatus"/);
  assert.match(html, /DISCORD_BOT_TOKEN: config\.DISCORD_BOT_TOKEN_CONFIGURED === true/);
  assert.match(html, /wireSecretInput\('discordBotToken', 'DISCORD_BOT_TOKEN'\)/);
  assert.match(html, /wireClearSecretButton\('clearDiscordBotToken', 'discordBotToken', 'DISCORD_BOT_TOKEN'\)/);
});

test('config page wires Discord save, toggle, and test-notification flows', () => {
  assert.match(html, /document\.getElementById\('discordUserId'\)\.value = config\.DISCORD_USER_ID \|\| ''/);
  assert.match(html, /DISCORD_BOT_TOKEN: document\.getElementById\('discordBotToken'\)\.value\.trim\(\)/);
  assert.match(html, /DISCORD_USER_ID: document\.getElementById\('discordUserId'\)\.value\.trim\(\)/);
  assert.match(html, /const discordConfig = document\.getElementById\('discordConfig'\)/);
  assert.match(html, /testDiscordBtn/);
  assert.match(html, /Discord 私信/);
  assert.match(html, /testNotification\('discord'\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/views/config-page-discord.test.js
```

Expected: FAIL because the current config page does not yet include any Discord UI or secret wiring.

- [ ] **Step 3: Write minimal implementation**

Add the Discord notifier checkbox in `src/views/configPage.html`:

```html
              <label class="inline-flex items-center">
                <input type="checkbox" name="enabledNotifiers" value="discord" class="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                <span class="ml-2 text-sm text-gray-700">Discord Bot 私信</span>
              </label>
```

Add the Discord config panel near the other notifier config blocks:

```html
          <div id="discordConfig" class="config-section">
            <h4 class="text-md font-medium text-gray-900 mb-3">Discord Bot 私信配置</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label for="discordBotToken" class="block text-sm font-medium text-gray-700">Bot Token</label>
                <div class="mt-1 flex flex-col sm:flex-row sm:items-center gap-3">
                  <input type="text" id="discordBotToken" placeholder="留空表示不修改；输入新值将更新" class="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <button type="button" id="clearDiscordBotToken" class="btn-warning text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                    <i class="fas fa-eraser mr-2"></i>清空
                  </button>
                </div>
                <p id="DISCORD_BOT_TOKENStatus" class="mt-1 text-xs text-gray-500">加载中...</p>
              </div>
              <div>
                <label for="discordUserId" class="block text-sm font-medium text-gray-700">Discord 用户 ID</label>
                <input type="text" id="discordUserId" placeholder="开启开发者模式后复制" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>
            </div>
            <div class="flex justify-end">
              <button type="button" id="testDiscordBtn" class="btn-secondary text-white px-4 py-2 rounded-md text-sm font-medium">
                <i class="fas fa-paper-plane mr-2"></i>测试 Discord 私信
              </button>
            </div>
          </div>
```

Extend `loadConfig()` in `src/views/configPage.html`:

```js
        document.getElementById('emailFrom').value = config.EMAIL_FROM || '';
        document.getElementById('emailFromName').value = config.EMAIL_FROM_NAME || '订阅提醒系统';
        document.getElementById('emailTo').value = config.EMAIL_TO || '';
        document.getElementById('discordUserId').value = config.DISCORD_USER_ID || '';
        document.getElementById('barkServer').value = config.BARK_SERVER || 'https://api.day.app';
```

```js
        document.getElementById('pushplusToken').value = '';
        document.getElementById('discordBotToken').value = '';
```

```js
        window.SECRET_CONFIGURED = {
          TG_BOT_TOKEN: config.TG_BOT_TOKEN_CONFIGURED === true,
          NOTIFYX_API_KEY: config.NOTIFYX_API_KEY_CONFIGURED === true,
          WEBHOOK_URL: config.WEBHOOK_URL_CONFIGURED === true,
          WEBHOOK_HEADERS: config.WEBHOOK_HEADERS_CONFIGURED === true,
          WECHATBOT_WEBHOOK: config.WECHATBOT_WEBHOOK_CONFIGURED === true,
          RESEND_API_KEY: config.RESEND_API_KEY_CONFIGURED === true,
          BARK_DEVICE_KEY: config.BARK_DEVICE_KEY_CONFIGURED === true,
          THIRD_PARTY_API_TOKEN: config.THIRD_PARTY_API_TOKEN_CONFIGURED === true,
          GOTIFY_APP_TOKEN: config.GOTIFY_APP_TOKEN_CONFIGURED === true,
          SERVERCHAN_SENDKEY: config.SERVERCHAN_SENDKEY_CONFIGURED === true,
          PUSHPLUS_TOKEN: config.PUSHPLUS_TOKEN_CONFIGURED === true,
          DISCORD_BOT_TOKEN: config.DISCORD_BOT_TOKEN_CONFIGURED === true
        };
```

Extend the toggle logic:

```js
      const telegramConfig = document.getElementById('telegramConfig');
      const notifyxConfig = document.getElementById('notifyxConfig');
      const webhookConfig = document.getElementById('webhookConfig');
      const wechatbotConfig = document.getElementById('wechatbotConfig');
      const emailConfig = document.getElementById('emailConfig');
      const barkConfig = document.getElementById('barkConfig');
      const gotifyConfig = document.getElementById('gotifyConfig');
      const serverchanConfig = document.getElementById('serverchanConfig');
      const pushplusConfig = document.getElementById('pushplusConfig');
      const discordConfig = document.getElementById('discordConfig');

      [telegramConfig, notifyxConfig, webhookConfig, wechatbotConfig, emailConfig, barkConfig, gotifyConfig, serverchanConfig, pushplusConfig, discordConfig].forEach(config => {
        config.classList.remove('active', 'inactive');
        config.classList.add('inactive');
      });
```

```js
        } else if (type === 'pushplus') {
          pushplusConfig.classList.remove('inactive');
          pushplusConfig.classList.add('active');
        } else if (type === 'discord') {
          discordConfig.classList.remove('inactive');
          discordConfig.classList.add('active');
        }
```

Extend the save payload:

```js
        GOTIFY_APP_TOKEN: document.getElementById('gotifyAppToken').value.trim(),
        SERVERCHAN_SENDKEY: document.getElementById('serverchanSendKey').value.trim(),
        PUSHPLUS_TOKEN: document.getElementById('pushplusToken').value.trim(),
        DISCORD_BOT_TOKEN: document.getElementById('discordBotToken').value.trim(),

        // 非敏感字段正常提交
        TG_CHAT_ID: document.getElementById('tgChatId').value.trim(),
```

```js
        PUSHPLUS_TOPIC: document.getElementById('pushplusTopic').value.trim(),
        PUSHPLUS_CHANNEL: document.getElementById('pushplusChannel').value.trim(),
        DISCORD_USER_ID: document.getElementById('discordUserId').value.trim(),
        ENABLED_NOTIFIERS: enabledNotifiers,
        TIMEZONE: document.getElementById('timezone').value.trim(),
```

Extend the test-notification button and label mapping:

```js
      const buttonId = type === 'telegram' ? 'testTelegramBtn' :
                      type === 'notifyx' ? 'testNotifyXBtn' :
                      type === 'wechatbot' ? 'testWechatBotBtn' :
                      type === 'email' ? 'testEmailBtn' :
                      type === 'bark' ? 'testBarkBtn' :
                      type === 'gotify' ? 'testGotifyBtn' :
                      type === 'serverchan' ? 'testServerchanBtn' :
                      type === 'pushplus' ? 'testPushplusBtn' :
                      type === 'discord' ? 'testDiscordBtn' : 'testWebhookBtn';
```

```js
      const serviceName = type === 'telegram' ? 'Telegram' :
                          type === 'notifyx' ? 'NotifyX' :
                          type === 'wechatbot' ? '企业微信机器人' :
                          type === 'email' ? '邮件通知' :
                          type === 'bark' ? 'Bark' :
                          type === 'gotify' ? 'Gotify' :
                          type === 'serverchan' ? 'Server酱' :
                          type === 'pushplus' ? 'PushPlus' :
                          type === 'discord' ? 'Discord 私信' : 'Webhook 通知';
```

Add Discord request assembly with secret-safe behavior:

```js
      } else if (type === 'discord') {
        const token = document.getElementById('discordBotToken').value.trim();
        const userId = document.getElementById('discordUserId').value.trim();
        if (token) config.DISCORD_BOT_TOKEN = token;
        config.DISCORD_USER_ID = userId;

        if (!config.DISCORD_USER_ID) {
          showToast('请先填写 Discord 用户 ID', 'warning');
          button.innerHTML = originalContent;
          button.disabled = false;
          return;
        }
      }
```

Wire the secret helpers and click handler on load:

```js
      wireSecretInput('gotifyAppToken', 'GOTIFY_APP_TOKEN');
      wireSecretInput('serverchanSendKey', 'SERVERCHAN_SENDKEY');
      wireSecretInput('pushplusToken', 'PUSHPLUS_TOKEN');
      wireSecretInput('discordBotToken', 'DISCORD_BOT_TOKEN');
```

```js
      wireClearSecretButton('clearGotifyAppToken', 'gotifyAppToken', 'GOTIFY_APP_TOKEN');
      wireClearSecretButton('clearServerchanSendKey', 'serverchanSendKey', 'SERVERCHAN_SENDKEY');
      wireClearSecretButton('clearPushplusToken', 'pushplusToken', 'PUSHPLUS_TOKEN');
      wireClearSecretButton('clearDiscordBotToken', 'discordBotToken', 'DISCORD_BOT_TOKEN');
```

```js
    document.getElementById('testPushplusBtn').addEventListener('click', () => {
      testNotification('pushplus');
    });

    document.getElementById('testDiscordBtn').addEventListener('click', () => {
      testNotification('discord');
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/views/config-page-discord.test.js
```

Expected: PASS with all config-page Discord assertions green and exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add tests/views/config-page-discord.test.js src/views/configPage.html
git commit -m "feat: add discord config page controls"
```

### Task 5: Run the full regression suite

**Files:**
- Test: `tests/core/time.test.js`
- Test: `tests/api/config-discord.test.js`
- Test: `tests/services/notify/discord.test.js`
- Test: `tests/api/test-notification-discord.test.js`
- Test: `tests/views/config-page-discord.test.js`

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm test
```

Expected: PASS with every test file green and exit code `0`.

- [ ] **Step 2: Confirm the working tree only contains the planned source changes**

Run:

```bash
git status --short
```

Expected: clean working tree immediately after the final feature commit.

- [ ] **Step 3: Record the final verification commit state**

Run:

```bash
git log --oneline --max-count=5
```

Expected: the latest commits should include:

```text
feat: add discord config page controls
feat: add discord notifier support
feat: add secure discord config support
feat: add kuala lumpur timezone labels
```
