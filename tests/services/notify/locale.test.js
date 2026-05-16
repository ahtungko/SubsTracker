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
  assert.equal(getNotificationMessage('reminder_due_today', 'zh'), '\u4eca\u5929\u5230\u671f\uff01');
  assert.equal(getNotificationMessage('reminder_due_today', 'en'), 'Due today!');
  assert.equal(getNotificationMessage('reminder_due_in_days', 'zh', { days: 3 }), '\u5c06\u5728 3 \u5929\u540e\u5230\u671f');
  assert.equal(getNotificationMessage('reminder_due_in_days', 'en', { days: 3 }), 'Due in 3 day(s)');
  assert.equal(getNotificationMessage('reminder_period_wrapper', 'en', { value: 1, unit: 'month' }), 'Billing cycle: 1 month');
  assert.equal(getNotificationMessage('reminder_label_type', 'en'), 'Type');
});

test('notification catalog exposes default locale strings', () => {
  assert.equal(NOTIFICATION_MESSAGES.zh.reminder_due_today, '\u4eca\u5929\u5230\u671f\uff01');
  assert.equal(NOTIFICATION_MESSAGES.en.reminder_due_today, 'Due today!');
  assert.equal(NOTIFICATION_MESSAGES.zh.reminder_fallback_category, '\u672a\u5206\u7c7b');
  assert.equal(NOTIFICATION_MESSAGES.en.reminder_fallback_category, 'Uncategorized');
});

test('notification catalog exposes localized wrapper and title keys for all channels', () => {
  assert.equal(getNotificationMessage('notification_scheduled_reminder_title', 'zh'), '\u8ba2\u9605\u5230\u671f/\u7eed\u8d39\u63d0\u9192');
  assert.equal(getNotificationMessage('notification_scheduled_reminder_title', 'en'), 'Subscription expiry/renewal reminder');
  assert.equal(getNotificationMessage('notification_notifyx_description', 'zh'), '\u8ba2\u9605\u63d0\u9192');
  assert.equal(getNotificationMessage('notification_notifyx_description', 'en'), 'Subscription reminder');
  assert.equal(getNotificationMessage('webhook_tags_line', 'zh', { tags: 'A\u3001B' }), '\u6807\u7b7e: A\u3001B');
  assert.equal(getNotificationMessage('webhook_tags_line', 'en', { tags: 'A, B' }), 'Tags: A, B');
  assert.equal(getNotificationMessage('webhook_sent_at_label', 'zh'), '\u53d1\u9001\u65f6\u95f4');
  assert.equal(getNotificationMessage('webhook_sent_at_label', 'en'), 'Sent at');
});
