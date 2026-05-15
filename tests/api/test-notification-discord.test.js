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

test('Discord test notifications honor trimmed request-body overrides for token and user id', async (t) => {
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
      headers: init?.headers ?? {},
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
    body: JSON.stringify({
      type: 'discord',
      DISCORD_BOT_TOKEN: '  override-token  ',
      DISCORD_USER_ID: '  override-user  '
    })
  });

  const response = await handleTestNotification(request, env);
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.success, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers.Authorization, 'Bot override-token');
  assert.deepEqual(JSON.parse(calls[0].body), {
    recipient_id: 'override-user'
  });
});
