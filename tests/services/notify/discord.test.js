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
  assert.equal(result.channelResults.discord, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://discord.com/api/v10/users/@me/channels');
  assert.equal(calls[1].url, 'https://discord.com/api/v10/channels/dm-channel-id/messages');

  const payload = JSON.parse(calls[1].body);
  assert.equal(payload.embeds[0].title, '\u{1F514} Billing reminder');
  assert.match(payload.embeds[0].description, /Renew soon/);
});

test('dispatcher counts Discord failure when DM channel creation does not return an id', async (t) => {
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
        json: async () => ({}),
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
  assert.equal(result.successCount, 0);
  assert.equal(result.failedCount, 1);
  assert.equal(result.channelResults.discord, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://discord.com/api/v10/users/@me/channels');
});
