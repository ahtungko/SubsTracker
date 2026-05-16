import test from 'node:test';
import assert from 'node:assert/strict';

import { sendNotificationToAllChannels } from '../../../src/services/notify/index.js';

test('NotifyX description uses English locale text when NOTIFICATION_LOCALE is en', async (t) => {
  const calls = [];
  const originalFetch = global.fetch;

  global.fetch = async (url, init) => {
    calls.push({ url, body: init?.body ?? '' });
    return {
      ok: true,
      json: async () => ({ status: 'queued' })
    };
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await sendNotificationToAllChannels(
    'Billing reminder',
    'Renew soon',
    {
      ENABLED_NOTIFIERS: ['notifyx'],
      NOTIFYX_API_KEY: 'notifyx-key',
      NOTIFICATION_LOCALE: 'en'
    },
    '[test]'
  );

  assert.equal(result.attempted, 1);
  assert.equal(result.successCount, 1);
  assert.equal(calls.length, 1);

  const payload = JSON.parse(calls[0].body);
  assert.equal(payload.description, 'Subscription reminder');
});
