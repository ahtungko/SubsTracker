import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  UI_MESSAGES,
  normalizeUiLocale,
  getTimezoneDisplayName,
  getMessage
} from '../../src/core/locale.js';

test('normalizeUiLocale maps Chinese browser locales to zh', () => {
  assert.equal(normalizeUiLocale('zh-CN'), 'zh');
  assert.equal(normalizeUiLocale('zh-MY'), 'zh');
  assert.equal(normalizeUiLocale('zh'), 'zh');
});

test('normalizeUiLocale maps English browser locales to en', () => {
  assert.equal(normalizeUiLocale('en-US'), 'en');
  assert.equal(normalizeUiLocale('en-GB'), 'en');
  assert.equal(normalizeUiLocale('en'), 'en');
});

test('normalizeUiLocale falls back to English for unsupported or missing locales', () => {
  assert.equal(normalizeUiLocale('ms-MY'), 'en');
  assert.equal(normalizeUiLocale('ja-JP'), 'en');
  assert.equal(normalizeUiLocale(''), 'en');
  assert.equal(normalizeUiLocale(undefined), 'en');
});

test('getTimezoneDisplayName returns localized timezone labels with English fallback', () => {
  assert.equal(getTimezoneDisplayName('Asia/Kuala_Lumpur', 'zh-CN'), '吉隆坡时间');
  assert.equal(getTimezoneDisplayName('Asia/Kuala_Lumpur', 'en-US'), 'Kuala Lumpur Time');
  assert.equal(getTimezoneDisplayName('Asia/Kuala_Lumpur', 'ms-MY'), 'Kuala Lumpur Time');
});

test('getTimezoneDisplayName falls back to raw timezone id when label is unknown', () => {
  assert.equal(getTimezoneDisplayName('Mars/Olympus_Mons', 'zh-CN'), 'Mars/Olympus_Mons');
});

test('locale catalog exports English default and the supported timezone ids used by config UI', () => {
  assert.equal(DEFAULT_UI_LOCALE, 'en');
  assert.deepEqual(SUPPORTED_TIMEZONE_IDS, [
    'UTC',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Taipei',
    'Asia/Singapore',
    'Asia/Kuala_Lumpur',
    'Asia/Tokyo',
    'Asia/Seoul',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland'
  ]);
  assert.equal(TIMEZONE_LABELS.zh['Asia/Kuala_Lumpur'], '吉隆坡时间');
  assert.equal(TIMEZONE_LABELS.en['Asia/Kuala_Lumpur'], 'Kuala Lumpur Time');
  assert.equal(UI_MESSAGES.zh.nav_dashboard, '仪表盘');
  assert.equal(UI_MESSAGES.en.nav_dashboard, 'Dashboard');
  assert.equal(UI_MESSAGES.zh.page_title_dashboard, '仪表盘 - SubsTracker');
  assert.equal(UI_MESSAGES.en.page_title_dashboard, 'Dashboard - SubsTracker');
  assert.equal(UI_MESSAGES.zh.page_title_login, '登录 - 订阅管理系统');
  assert.equal(UI_MESSAGES.en.page_title_login, 'Login - Subscription Manager');
  assert.equal(UI_MESSAGES.zh.login_submit, '登录');
  assert.equal(UI_MESSAGES.en.login_submit, 'Sign In');
  assert.equal(UI_MESSAGES.zh.aria_toggle_navigation_menu, '切换导航菜单');
  assert.equal(UI_MESSAGES.en.aria_toggle_navigation_menu, 'Toggle navigation menu');
});

test('getMessage returns Chinese UI copy for zh locales', () => {
  assert.equal(getMessage('nav_dashboard', 'zh-CN'), '仪表盘');
  assert.equal(getMessage('config_save', 'zh-MY'), '保存设置');
});

test('getMessage returns English UI copy for en locales', () => {
  assert.equal(getMessage('nav_dashboard', 'en-US'), 'Dashboard');
  assert.equal(getMessage('config_save', 'en-GB'), 'Save Settings');
});

test('getMessage returns localized notification locale field strings', () => {
  assert.equal(getMessage('config_label_notification_locale', 'zh-CN'), '\u901a\u77e5\u8bed\u8a00');
  assert.equal(getMessage('config_label_notification_locale', 'en-US'), 'Notification Language');
  assert.equal(getMessage('config_notification_locale_help', 'zh-CN'), '\u6b64\u8bbe\u7f6e\u63a7\u5236\u63d0\u9192\u90ae\u4ef6\u3001Discord \u79c1\u4fe1\u53ca\u5176\u4ed6\u5bf9\u5916\u901a\u77e5\u6240\u4f7f\u7528\u7684\u8bed\u8a00\u3002');
  assert.equal(getMessage('config_notification_locale_help', 'en-US'), 'This setting controls the language used in reminder emails, Discord DMs, and other outbound notifications.');
});

test('getMessage returns localized browser-title strings', () => {
  assert.equal(getMessage('page_title_dashboard', 'zh-CN'), '仪表盘 - SubsTracker');
  assert.equal(getMessage('page_title_dashboard', 'en-US'), 'Dashboard - SubsTracker');
  assert.equal(getMessage('page_title_config', 'ja-JP'), 'Settings - Subscription Manager');
});

test('getMessage returns localized login page strings', () => {
  assert.equal(getMessage('page_title_login', 'zh-CN'), '登录 - 订阅管理系统');
  assert.equal(getMessage('login_heading', 'en-US'), 'Subscription Manager');
  assert.equal(getMessage('login_submit', 'en-US'), 'Sign In');
});

test('getMessage returns localized accessibility labels', () => {
  assert.equal(getMessage('aria_toggle_navigation_menu', 'zh-CN'), '切换导航菜单');
  assert.equal(getMessage('aria_toggle_navigation_menu', 'en-US'), 'Toggle navigation menu');
});

test('getMessage falls back to English for unsupported locales', () => {
  assert.equal(getMessage('nav_dashboard', 'ms-MY'), 'Dashboard');
  assert.equal(getMessage('config_section_display_settings', 'ja-JP'), 'Display Settings');
});

test('getMessage falls back to English for unsupported login locales', () => {
  assert.equal(getMessage('page_title_login', 'ja-JP'), 'Login - Subscription Manager');
  assert.equal(getMessage('login_error_generic', 'ms-MY'), 'Something went wrong. Please try again later');
});

test('getMessage falls back to the key when no translation exists', () => {
  assert.equal(getMessage('missing_message_key', 'zh-CN'), 'missing_message_key');
});


test('getMessage returns localized admin and dashboard runtime error strings', () => {
  assert.equal(getMessage('admin_test_button_missing', 'zh-CN'), '\u672a\u627e\u5230\u6d4b\u8bd5\u6309\u94ae\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u540e\u91cd\u8bd5');
  assert.equal(getMessage('admin_test_button_missing', 'en-US'), 'Test button not found. Please refresh and try again.');
  assert.equal(getMessage('admin_test_missing_subscription_id', 'zh-CN'), '\u8ba2\u9605 ID \u7f3a\u5931\uff0c\u65e0\u6cd5\u53d1\u9001\u6d4b\u8bd5\u901a\u77e5');
  assert.equal(getMessage('admin_test_network_error', 'en-US'), 'A network error occurred while sending the test notification. Please try again later.');
  assert.equal(getMessage('test_notification_invalid_response', 'zh-CN'), '\u670d\u52a1\u8fd4\u56de\u4e86\u65e0\u6cd5\u89e3\u6790\u7684\u54cd\u5e94');
  assert.equal(getMessage('test_notification_http_prefix', 'en-US'), 'HTTP ');
  assert.equal(getMessage('config_test_gotify_server_required', 'en-US'), 'Please enter the Gotify Server URL first.');
  assert.equal(getMessage('config_test_discord_user_id_required', 'zh-CN'), '\u8bf7\u5148\u586b\u5199 Discord \u7528\u6237 ID');
  assert.equal(getMessage('admin_fetch_subscription_failed', 'zh-CN'), '\u83b7\u53d6\u8ba2\u9605\u4fe1\u606f\u5931\u8d25');
  assert.equal(getMessage('dashboard_load_failed', 'zh-CN'), '\u52a0\u8f7d\u5931\u8d25');
  assert.equal(getMessage('dashboard_load_failed_prefix', 'en-US'), 'Failed to load:');
});

test('getMessage returns localized config save runtime strings', () => {
  assert.equal(getMessage('config_save_in_progress', 'zh-CN'), '\u4fdd\u5b58\u4e2d...');
  assert.equal(getMessage('config_save_in_progress', 'en-US'), 'Saving...');
  assert.equal(getMessage('config_save_success', 'zh-CN'), '\u914d\u7f6e\u4fdd\u5b58\u6210\u529f');
  assert.equal(getMessage('config_save_success', 'en-US'), 'Settings saved');
  assert.equal(getMessage('config_save_failed_unknown', 'zh-CN'), '\u914d\u7f6e\u4fdd\u5b58\u5931\u8d25\uff1a\u672a\u77e5\u9519\u8bef');
  assert.equal(getMessage('config_save_failed_unknown', 'en-US'), 'Settings save failed: Unknown error');
  assert.equal(getMessage('config_save_failed_retry', 'zh-CN'), '\u4fdd\u5b58\u914d\u7f6e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5');
  assert.equal(getMessage('config_save_failed_retry', 'en-US'), 'Failed to save settings. Please try again later.');
});
