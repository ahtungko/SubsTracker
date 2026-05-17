import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TYPE_PRESET_KEYS,
  CATEGORY_PRESET_KEYS,
  normalizeCustomTypeValue,
  normalizeCategoryValue,
  localizeCustomTypeValue,
  localizeCategoryValue,
  getLocalizedTypeOptions,
  getLocalizedCategoryOptions
} from '../../src/core/subscriptionTaxonomy.js';

test('taxonomy exposes stable preset keys for type and category', () => {
  assert.ok(TYPE_PRESET_KEYS.includes('music_platform'));
  assert.ok(TYPE_PRESET_KEYS.includes('streaming_media'));
  assert.ok(CATEGORY_PRESET_KEYS.includes('personal'));
  assert.ok(CATEGORY_PRESET_KEYS.includes('productivity'));
});

test('taxonomy normalizes legacy preset labels to stable keys', () => {
  assert.equal(normalizeCustomTypeValue('音乐平台'), 'music_platform');
  assert.equal(normalizeCustomTypeValue('Music Platform'), 'music_platform');
  assert.equal(normalizeCustomTypeValue('music_platform'), 'music_platform');
  assert.equal(normalizeCustomTypeValue('My Custom Type'), 'My Custom Type');

  assert.equal(normalizeCategoryValue('个人'), 'personal');
  assert.equal(normalizeCategoryValue('Productivity'), 'productivity');
  assert.equal(normalizeCategoryValue('个人/娱乐'), 'personal/entertainment');
  assert.equal(normalizeCategoryValue('personal, entertainment'), 'personal/entertainment');
  assert.equal(normalizeCategoryValue('Personal / MyTag'), 'personal/MyTag');
});

test('taxonomy localizes stable keys for display', () => {
  assert.equal(localizeCustomTypeValue('music_platform', 'zh'), '音乐平台');
  assert.equal(localizeCustomTypeValue('music_platform', 'en'), 'Music Platform');
  assert.equal(localizeCustomTypeValue('My Custom Type', 'en'), 'My Custom Type');

  assert.equal(localizeCategoryValue('personal/entertainment', 'zh'), '个人/娱乐');
  assert.equal(localizeCategoryValue('personal/entertainment', 'en'), 'Personal/Entertainment');
  assert.equal(localizeCategoryValue('personal/MyTag', 'en'), 'Personal/MyTag');
});

test('taxonomy returns localized option lists for the active locale', () => {
  const zhTypes = getLocalizedTypeOptions('zh');
  const enTypes = getLocalizedTypeOptions('en');
  const zhCategories = getLocalizedCategoryOptions('zh');
  const enCategories = getLocalizedCategoryOptions('en');

  assert.ok(zhTypes.includes('音乐平台'));
  assert.ok(enTypes.includes('Music Platform'));
  assert.ok(zhCategories.includes('个人'));
  assert.ok(enCategories.includes('Personal'));
});
