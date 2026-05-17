import { getTimezoneDisplayName, getUiLocaleTag, normalizeUiLocale } from './locale.js';

// 时间与时区工具
const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function resolveLocaleTag(locale = 'zh') {
  return getUiLocaleTag(normalizeUiLocale(locale || 'zh'));
}

function getCurrentTimeInTimezone(timezone = 'UTC') {
  try {
    return new Date();
  } catch (error) {
    console.error(`时区转换错误: ${error.message}`);
    return new Date();
  }
}

function getTimestampInTimezone(timezone = 'UTC') {
  return getCurrentTimeInTimezone(timezone).getTime();
}

function convertUTCToTimezone(utcTime, timezone = 'UTC') {
  try {
    return new Date(utcTime);
  } catch (error) {
    console.error(`时区转换错误: ${error.message}`);
    return new Date(utcTime);
  }
}

function getTimezoneDateParts(date, timezone = 'UTC') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const pick = (type) => {
      const part = parts.find(item => item.type === type);
      return part ? Number(part.value) : 0;
    };
    return {
      year: pick('year'),
      month: pick('month'),
      day: pick('day'),
      hour: pick('hour'),
      minute: pick('minute'),
      second: pick('second')
    };
  } catch (error) {
    console.error(`解析时区(${timezone})失败: ${error.message}`);
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds()
    };
  }
}

function getTimezoneMidnightTimestamp(date, timezone = 'UTC') {
  const { year, month, day } = getTimezoneDateParts(date, timezone);
  return Date.UTC(year, month - 1, day, 0, 0, 0);
}

function formatTimeInTimezone(time, timezone = 'UTC', format = 'full', locale = 'zh') {
  try {
    const date = new Date(time);
    const localeTag = resolveLocaleTag(locale);

    if (format === 'date') {
      return date.toLocaleDateString(localeTag, {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } else if (format === 'datetime') {
      return date.toLocaleString(localeTag, {
        timeZone: timezone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else {
      return date.toLocaleString(localeTag, {
        timeZone: timezone
      });
    }
  } catch (error) {
    console.error(`时间格式化错误: ${error.message}`);
    return new Date(time).toISOString();
  }
}

function getTimezoneOffset(timezone = 'UTC') {
  try {
    const now = new Date();
    const { year, month, day, hour, minute, second } = getTimezoneDateParts(now, timezone);
    const zonedTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);
    return Math.round((zonedTimestamp - now.getTime()) / MS_PER_HOUR);
  } catch (error) {
    console.error(`获取时区偏移量错误: ${error.message}`);
    return 0;
  }
}

function formatTimezoneDisplay(timezone = 'UTC', locale = 'zh') {
  try {
    const offset = getTimezoneOffset(timezone);
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
    const timezoneName = getTimezoneDisplayName(timezone, locale);
    return `${timezoneName} (UTC${offsetStr})`;
  } catch (error) {
    console.error('格式化时区显示失败:', error);
    return timezone;
  }
}

function formatBeijingTime(date = new Date(), format = 'full') {
  return formatTimeInTimezone(date, 'Asia/Shanghai', format, 'zh');
}

function extractTimezone(request) {
  const url = new URL(request.url);
  const timezoneParam = url.searchParams.get('timezone');

  if (timezoneParam) return timezoneParam;

  const timezoneHeader = request.headers.get('X-Timezone');
  if (timezoneHeader) return timezoneHeader;

  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    if (acceptLanguage.includes('zh')) return 'Asia/Shanghai';
    if (acceptLanguage.includes('en-US')) return 'America/New_York';
    if (acceptLanguage.includes('en-GB')) return 'Europe/London';
  }

  return 'UTC';
}

function isValidTimezone(timezone) {
  try {
    new Date().toLocaleString('en-US', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

export {
  MS_PER_HOUR,
  MS_PER_DAY,
  getCurrentTimeInTimezone,
  getTimestampInTimezone,
  convertUTCToTimezone,
  getTimezoneDateParts,
  getTimezoneMidnightTimestamp,
  formatTimeInTimezone,
  getTimezoneOffset,
  formatTimezoneDisplay,
  formatBeijingTime,
  extractTimezone,
  isValidTimezone
};
