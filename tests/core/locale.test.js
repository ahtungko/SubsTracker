import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  normalizeUiLocale,
  getTimezoneDisplayName
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
});
