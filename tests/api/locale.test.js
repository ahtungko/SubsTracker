import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractRequestLocale,
  formatServerMessage,
  getServerMessage,
  normalizeServerLocale,
  SERVER_MESSAGES
} from '../../src/api/locale.js';

import { handleLogin } from '../../src/api/handlers/auth.js';
import { handleApiRequest } from '../../src/api/router.js';
import { handleTestNotification } from '../../src/api/handlers/test-notification.js';

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
  assert.equal(getServerMessage('api_unauthorized', 'zh-CN'), '\u672a\u6388\u6743\u8bbf\u95ee');
  assert.equal(getServerMessage('api_unauthorized', 'en-US'), 'Unauthorized access');
  assert.equal(getServerMessage('api_unauthorized', 'ja-JP'), 'Unauthorized access');
});

test('getServerMessage formats localized server templates with params', () => {
  assert.equal(formatServerMessage('Hello {name}', { name: 'world' }), 'Hello world');
  assert.equal(
    getServerMessage('subscription_test_failed_attempted', 'zh-CN', { attempted: 3 }),
    '\u6d4b\u8bd5\u901a\u77e5\u53d1\u9001\u5931\u8d25\uff0c\u5df2\u5c1d\u8bd5 3 \u4e2a\u6e20\u9053'
  );
  assert.equal(
    getServerMessage('test_notification_success_template', 'en-US', {
      service: getServerMessage('test_notification_service_notifyx', 'en-US')
    }),
    'NotifyX notification sent successfully'
  );
});

test('getServerMessage falls back to key for unknown messages', () => {
  assert.equal(getServerMessage('missing_server_message', 'zh-CN'), 'missing_server_message');
});

test('server catalog exports expected core API message keys', () => {
  assert.equal(SERVER_MESSAGES.zh.api_unauthorized, '\u672a\u6388\u6743\u8bbf\u95ee');
  assert.equal(SERVER_MESSAGES.en.api_unauthorized, 'Unauthorized access');
  assert.equal(SERVER_MESSAGES.zh.login_invalid_credentials, '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef');
  assert.equal(SERVER_MESSAGES.en.login_invalid_credentials, 'Incorrect username or password');
  assert.equal(
    SERVER_MESSAGES.zh.subscription_test_no_channels,
    '\u672a\u542f\u7528\u4efb\u4f55\u901a\u77e5\u6e20\u9053\uff0c\u8bf7\u5148\u5728\u7cfb\u7edf\u8bbe\u7f6e\u4e2d\u81f3\u5c11\u5f00\u542f\u4e00\u79cd\u901a\u77e5\u65b9\u5f0f\u3002'
  );
  assert.equal(
    SERVER_MESSAGES.en.subscription_test_no_channels,
    'No notification channels are enabled. Enable at least one notification method in Settings first.'
  );
  assert.equal(SERVER_MESSAGES.zh.subscription_test_send_error_prefix, '\u53d1\u9001\u65f6\u53d1\u751f\u9519\u8bef\uff1a');
  assert.equal(SERVER_MESSAGES.en.subscription_test_send_error_prefix, 'An error occurred while sending: ');
  assert.equal(
    SERVER_MESSAGES.zh.subscription_test_failed_attempted,
    '\u6d4b\u8bd5\u901a\u77e5\u53d1\u9001\u5931\u8d25\uff0c\u5df2\u5c1d\u8bd5 {attempted} \u4e2a\u6e20\u9053'
  );
  assert.equal(
    SERVER_MESSAGES.en.subscription_test_full_success,
    'Test notification sent successfully ({successCount} channel(s) total)'
  );
  assert.equal(SERVER_MESSAGES.zh.test_notification_service_discord, 'Discord \u79c1\u4fe1');
  assert.equal(
    SERVER_MESSAGES.en.test_notification_failure_template,
    '{service} failed to send. Please check the configuration.'
  );
});

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

  assert.equal(zhBody.message, '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef');
  assert.equal(enBody.message, 'Incorrect username or password');
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
  assert.equal(zhBody.message, '\u672a\u6388\u6743\u8bbf\u95ee');
  assert.equal(enBody.message, 'Unauthorized access');
});

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

  assert.equal(zhBody.message, '\u7f3a\u5c11\u6d4b\u8bd5\u7c7b\u578b\u53c2\u6570 type');
  assert.equal(enBody.message, 'Missing required test type parameter: type');
});

test('handleTestNotification localizes supported notifier success messages for zh and en', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    json: async () => ({ status: 'queued' })
  });

  try {
    const zhRequest = new Request('https://example.com/api/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Locale': 'zh-CN'
      },
      body: JSON.stringify({ type: 'notifyx', NOTIFYX_API_KEY: 'demo-key' })
    });
    const enRequest = new Request('https://example.com/api/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Locale': 'en-US'
      },
      body: JSON.stringify({ type: 'notifyx', NOTIFYX_API_KEY: 'demo-key' })
    });

    const zhResponse = await handleTestNotification(zhRequest, configEnv);
    const enResponse = await handleTestNotification(enRequest, configEnv);
    const zhBody = await zhResponse.json();
    const enBody = await enResponse.json();

    assert.equal(zhBody.success, true);
    assert.equal(enBody.success, true);
    assert.equal(zhBody.message, 'NotifyX \u901a\u77e5\u53d1\u9001\u6210\u529f');
    assert.equal(enBody.message, 'NotifyX notification sent successfully');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('handleTestNotification localizes supported notifier failure messages for zh and en', async () => {
  const zhRequest = new Request('https://example.com/api/test-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Locale': 'zh-CN'
    },
    body: JSON.stringify({ type: 'notifyx' })
  });
  const enRequest = new Request('https://example.com/api/test-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Locale': 'en-US'
    },
    body: JSON.stringify({ type: 'notifyx' })
  });

  const zhResponse = await handleTestNotification(zhRequest, configEnv);
  const enResponse = await handleTestNotification(enRequest, configEnv);
  const zhBody = await zhResponse.json();
  const enBody = await enResponse.json();

  assert.equal(zhBody.success, false);
  assert.equal(enBody.success, false);
  assert.equal(zhBody.message, 'NotifyX \u901a\u77e5\u53d1\u9001\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u914d\u7f6e');
  assert.equal(enBody.message, 'NotifyX notification failed to send. Please check the configuration.');
});
