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
