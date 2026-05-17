import { normalizeUiLocale } from './locale.js';

const CATEGORY_SEPARATOR_REGEX = /[\/\uFF0C,\s]+/;

const TYPE_PRESETS = [
  { key: 'streaming_media', zh: '流媒体', en: 'Streaming Media' },
  { key: 'video_platform', zh: '视频平台', en: 'Video Platform' },
  { key: 'music_platform', zh: '音乐平台', en: 'Music Platform' },
  { key: 'cloud_service', zh: '云服务', en: 'Cloud Service' },
  { key: 'software_subscription', zh: '软件订阅', en: 'Software Subscription' },
  { key: 'domain_name', zh: '域名', en: 'Domain' },
  { key: 'server', zh: '服务器', en: 'Server' },
  { key: 'membership_service', zh: '会员服务', en: 'Membership Service' },
  { key: 'learning_platform', zh: '学习平台', en: 'Learning Platform' },
  { key: 'fitness_sports', zh: '健身/运动', en: 'Fitness/Sports' },
  { key: 'gaming', zh: '游戏', en: 'Gaming' },
  { key: 'news_magazine', zh: '新闻/杂志', en: 'News/Magazine' },
  { key: 'birthday', zh: '生日', en: 'Birthday' },
  { key: 'anniversary', zh: '纪念日', en: 'Anniversary' },
  { key: 'other', zh: '其他', en: 'Other' }
];

const CATEGORY_PRESETS = [
  { key: 'personal', zh: '个人', en: 'Personal' },
  { key: 'family', zh: '家庭', en: 'Family' },
  { key: 'work', zh: '工作', en: 'Work' },
  { key: 'company', zh: '公司', en: 'Company' },
  { key: 'entertainment', zh: '娱乐', en: 'Entertainment' },
  { key: 'learning', zh: '学习', en: 'Learning' },
  { key: 'development', zh: '开发', en: 'Development' },
  { key: 'productivity', zh: '生产力', en: 'Productivity' },
  { key: 'social', zh: '社交', en: 'Social' },
  { key: 'health', zh: '健康', en: 'Health' },
  { key: 'finance', zh: '财务', en: 'Finance' }
];

const TYPE_PRESET_KEYS = TYPE_PRESETS.map(item => item.key);
const CATEGORY_PRESET_KEYS = CATEGORY_PRESETS.map(item => item.key);

function getLocalizedPresetLabel(preset, locale = 'en') {
  const resolvedLocale = normalizeUiLocale(locale);
  return resolvedLocale === 'zh' ? preset.zh : preset.en;
}

function buildAliasMap(presets) {
  const map = new Map();
  presets.forEach((preset) => {
    const aliases = [preset.key, preset.zh, preset.en];
    aliases.forEach((alias) => {
      map.set(String(alias).trim().toLowerCase(), preset.key);
    });
  });
  return map;
}

const TYPE_ALIAS_MAP = buildAliasMap(TYPE_PRESETS);
const CATEGORY_ALIAS_MAP = buildAliasMap(CATEGORY_PRESETS);

function normalizePresetValue(rawValue, aliasMap) {
  if (typeof rawValue !== 'string') return '';
  const trimmed = rawValue.trim();
  if (!trimmed) return '';
  return aliasMap.get(trimmed.toLowerCase()) || trimmed;
}

function localizePresetValue(rawValue, presets, aliasMap, locale = 'en') {
  const normalizedValue = normalizePresetValue(rawValue, aliasMap);
  const preset = presets.find(item => item.key === normalizedValue);
  return preset ? getLocalizedPresetLabel(preset, locale) : normalizedValue;
}

function normalizeCustomTypeValue(rawValue) {
  return normalizePresetValue(rawValue, TYPE_ALIAS_MAP);
}

function normalizeCategoryValue(rawValue) {
  if (typeof rawValue !== 'string') return '';
  const tokens = rawValue
    .split(CATEGORY_SEPARATOR_REGEX)
    .map(token => normalizePresetValue(token, CATEGORY_ALIAS_MAP))
    .filter(Boolean);

  return tokens.join('/');
}

function localizeCustomTypeValue(rawValue, locale = 'en') {
  return localizePresetValue(rawValue, TYPE_PRESETS, TYPE_ALIAS_MAP, locale);
}

function localizeCategoryValue(rawValue, locale = 'en') {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return '';
  return rawValue
    .split(CATEGORY_SEPARATOR_REGEX)
    .map(token => localizePresetValue(token, CATEGORY_PRESETS, CATEGORY_ALIAS_MAP, locale))
    .filter(Boolean)
    .join('/');
}

function getLocalizedTypeOptions(locale = 'en') {
  return TYPE_PRESETS.map(item => getLocalizedPresetLabel(item, locale));
}

function getLocalizedCategoryOptions(locale = 'en') {
  return CATEGORY_PRESETS.map(item => getLocalizedPresetLabel(item, locale));
}

export {
  CATEGORY_PRESET_KEYS,
  CATEGORY_PRESETS,
  CATEGORY_SEPARATOR_REGEX,
  TYPE_PRESET_KEYS,
  TYPE_PRESETS,
  getLocalizedCategoryOptions,
  getLocalizedTypeOptions,
  localizeCategoryValue,
  localizeCustomTypeValue,
  normalizeCategoryValue,
  normalizeCustomTypeValue
};
