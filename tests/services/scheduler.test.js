import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkExpiringSubscriptions } from '../../src/services/scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schedulerSource = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'services', 'scheduler.js'), 'utf8');

function createEnv(config, subscriptions) {
  const store = new Map([
    ['config', JSON.stringify(config)],
    ['subscriptions', JSON.stringify(subscriptions)]
  ]);

  return {
    store,
    SUBSCRIPTIONS_KV: {
      async get(key) {
        return store.has(key) ? store.get(key) : null;
      },
      async put(key, value) {
        store.set(key, value);
      }
    }
  };
}

test('scheduled reminders use an English outbound title when NOTIFICATION_LOCALE is en', async (t) => {
  const calls = [];
  const originalFetch = global.fetch;

  global.fetch = async (url, init) => {
    calls.push({ url, body: init?.body ?? '' });

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

  const dueSoon = new Date(Date.now() + 30 * 60 * 1000);
  const env = createEnv(
    {
      ENABLED_NOTIFIERS: ['discord'],
      DISCORD_BOT_TOKEN: 'bot-token',
      DISCORD_USER_ID: 'user-1',
      NOTIFICATION_LOCALE: 'en',
      NOTIFICATION_HOURS: [],
      TIMEZONE: 'UTC'
    },
    [
      {
        id: 'sub-1',
        name: 'Netflix',
        customType: 'Streaming',
        category: 'Entertainment',
        amount: 15,
        currency: 'USD',
        periodValue: 1,
        periodUnit: 'month',
        expiryDate: dueSoon.toISOString(),
        reminderUnit: 'hour',
        reminderValue: 1,
        isActive: true,
        autoRenew: false,
        useLunar: false,
        notes: ''
      }
    ]
  );

  await checkExpiringSubscriptions(env);

  assert.equal(calls.length, 2);
  const payload = JSON.parse(calls[1].body);
  assert.equal(payload.embeds[0].title, '🔔 Subscription expiry/renewal reminder');
});

test('scheduler stores a structured no-match reason instead of hardcoded Chinese text', async () => {
  const env = createEnv(
    {
      ENABLED_NOTIFIERS: ['discord'],
      DISCORD_BOT_TOKEN: 'bot-token',
      DISCORD_USER_ID: 'user-1',
      NOTIFICATION_LOCALE: 'en',
      NOTIFICATION_HOURS: [],
      TIMEZONE: 'UTC'
    },
    []
  );

  await checkExpiringSubscriptions(env);

  const status = JSON.parse(env.store.get('scheduler_status'));
  assert.equal(status.sent, false);
  assert.equal(status.reasonKey, 'dashboard_scheduler_reason_no_matches');
  assert.deepEqual(status.reasonParams || {}, {});
});

test('scheduler source does not keep hardcoded status reason literals', () => {
  assert.equal(schedulerSource.includes('本次未命中需要提醒的订阅'), false);
  assert.equal(schedulerSource.includes('当前小时 '), false);
  assert.equal(schedulerSource.includes('命中 '), false);
  assert.equal(schedulerSource.includes('未启用任何通知渠道'), false);
  assert.equal(schedulerSource.includes('执行异常: '), false);
});
