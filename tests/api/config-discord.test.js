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

test('handleUpdateConfig defaults non-string NOTIFICATION_LOCALE values to en without throwing', async () => {
  const env = createEnv({
    JWT_SECRET: 'jwt-secret',
    ADMIN_USERNAME: 'admin',
    NOTIFICATION_LOCALE: 'zh'
  });

  const updateRequest = new Request('https://example.test/api/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ADMIN_USERNAME: 'admin',
      NOTIFICATION_LOCALE: { locale: 'zh' },
      ENABLED_NOTIFIERS: ['discord']
    })
  });

  const updateResponse = await handleUpdateConfig(updateRequest, env);
  assert.equal(updateResponse.status, 200);

  const saved = JSON.parse(env.__store.get('config'));
  assert.equal(saved.NOTIFICATION_LOCALE, 'en');
});

test('handleGetConfig normalizes invalid stored NOTIFICATION_LOCALE values to en', async () => {
  const env = createEnv({
    JWT_SECRET: 'jwt-secret',
    ADMIN_USERNAME: 'admin',
    NOTIFICATION_LOCALE: 'fr'
  });

  const response = await handleGetConfig(env);
  const json = await response.json();

  assert.equal(json.NOTIFICATION_LOCALE, 'en');
});
