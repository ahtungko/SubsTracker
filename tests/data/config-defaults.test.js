import test from 'node:test';
import assert from 'node:assert/strict';

import { getConfig } from '../../src/data/config.js';

test('getConfig does not inject a Chinese default email sender name into English configs', async () => {
  const store = new Map();
  const env = {
    SUBSCRIPTIONS_KV: {
      async get(key) {
        return store.has(key) ? store.get(key) : null;
      },
      async put(key, value) {
        store.set(key, value);
      }
    }
  };

  const config = await getConfig(env);

  assert.equal(config.NOTIFICATION_LOCALE, 'en');
  assert.equal(config.EMAIL_FROM_NAME, '');
});
