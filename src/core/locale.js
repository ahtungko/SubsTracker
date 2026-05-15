const DEFAULT_UI_LOCALE = 'en';

const SUPPORTED_TIMEZONE_IDS = [
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
];

const TIMEZONE_LABELS = {
  zh: {
    'UTC': '世界标准时间',
    'Asia/Shanghai': '中国标准时间',
    'Asia/Hong_Kong': '香港时间',
    'Asia/Taipei': '台北时间',
    'Asia/Singapore': '新加坡时间',
    'Asia/Kuala_Lumpur': '吉隆坡时间',
    'Asia/Tokyo': '日本时间',
    'Asia/Seoul': '韩国时间',
    'America/New_York': '美国东部时间',
    'America/Chicago': '美国中部时间',
    'America/Denver': '美国山地时间',
    'America/Los_Angeles': '美国太平洋时间',
    'Europe/London': '英国时间',
    'Europe/Paris': '巴黎时间',
    'Europe/Berlin': '柏林时间',
    'Europe/Moscow': '莫斯科时间',
    'Australia/Sydney': '悉尼时间',
    'Australia/Melbourne': '墨尔本时间',
    'Pacific/Auckland': '奥克兰时间'
  },
  en: {
    'UTC': 'UTC',
    'Asia/Shanghai': 'China Standard Time',
    'Asia/Hong_Kong': 'Hong Kong Time',
    'Asia/Taipei': 'Taipei Time',
    'Asia/Singapore': 'Singapore Time',
    'Asia/Kuala_Lumpur': 'Kuala Lumpur Time',
    'Asia/Tokyo': 'Japan Time',
    'Asia/Seoul': 'Korea Time',
    'America/New_York': 'US Eastern Time',
    'America/Chicago': 'US Central Time',
    'America/Denver': 'US Mountain Time',
    'America/Los_Angeles': 'US Pacific Time',
    'Europe/London': 'UK Time',
    'Europe/Paris': 'Paris Time',
    'Europe/Berlin': 'Berlin Time',
    'Europe/Moscow': 'Moscow Time',
    'Australia/Sydney': 'Sydney Time',
    'Australia/Melbourne': 'Melbourne Time',
    'Pacific/Auckland': 'Auckland Time'
  }
};

function normalizeUiLocale(rawLocale) {
  if (typeof rawLocale !== 'string') {
    return DEFAULT_UI_LOCALE;
  }

  const locale = rawLocale.trim().toLowerCase();
  if (!locale) {
    return DEFAULT_UI_LOCALE;
  }

  if (locale === 'zh' || locale.startsWith('zh-')) {
    return 'zh';
  }

  if (locale === 'en' || locale.startsWith('en-')) {
    return 'en';
  }

  return DEFAULT_UI_LOCALE;
}

function getTimezoneDisplayName(timezone, locale = DEFAULT_UI_LOCALE) {
  const resolvedLocale = normalizeUiLocale(locale);
  const localizedLabels = TIMEZONE_LABELS[resolvedLocale] || TIMEZONE_LABELS[DEFAULT_UI_LOCALE];
  const fallbackLabels = TIMEZONE_LABELS[DEFAULT_UI_LOCALE] || {};

  return localizedLabels[timezone] || fallbackLabels[timezone] || timezone;
}

export {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  normalizeUiLocale,
  getTimezoneDisplayName
};
