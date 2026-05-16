import test from 'node:test';
import assert from 'node:assert/strict';

import { sendWebhookNotification } from '../../../src/services/notify/webhook.js';

test('webhook wrapper labels use English locale text when NOTIFICATION_LOCALE is en', async (t) => {
  const calls = [];
  const originalFetch = global.fetch;

  global.fetch = async (url, init) => {
    calls.push({ url, body: init?.body ?? '' });
    return {
      ok: true,
      status: 200,
      text: async () => 'ok'
    };
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const success = await sendWebhookNotification(
    'Billing reminder',
    'Renew soon',
    {
      WEBHOOK_URL: 'https://example.test/webhook',
      NOTIFICATION_LOCALE: 'en',
      TIMEZONE: 'UTC'
    },
    {
      tags: ['billing', 'renewal']
    }
  );

  assert.equal(success, true);
  assert.equal(calls.length, 1);

  const payload = JSON.parse(calls[0].body);
  assert.equal(payload.tagsLine, 'Tags: billing, renewal');
  assert.match(payload.message, /Tags: billing, renewal/);
  assert.match(payload.message, /Sent at:/);
});
