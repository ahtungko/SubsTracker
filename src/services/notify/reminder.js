import { formatTimeInTimezone, formatTimezoneDisplay, getTimezoneDateParts } from '../../core/time.js';
import { lunarCalendar } from '../../core/lunar.js';
import { getNotificationLocale, getNotificationMessage } from './locale.js';
import { localizeCategoryValue, localizeCustomTypeValue } from '../../core/subscriptionTaxonomy.js';
import { formatAmount } from '../../core/currency-format.js';

/**
 * 按用户时区把到期日转成农历展示文案，避免用 Date 本地分量导致差一天。
 *
 * @param {Date | string | number} expiry
 * @param {string} timezone
 * @returns {string} 空串表示无法转换或不展示
 */
function formatLunarExpiryText(expiry, timezone) {
  const parts = getTimezoneDateParts(expiry, timezone || 'UTC');
  const lunarExpiry = lunarCalendar.solar2lunar(parts.year, parts.month, parts.day);
  return lunarExpiry ? `\n农历日期: ${lunarExpiry.fullStr}` : '';
}

function resolveReminderSetting(subscription) {
  const defaultDays = subscription && subscription.reminderDays !== undefined ? Number(subscription.reminderDays) : 7;
  let unit = subscription && subscription.reminderUnit === 'hour' ? 'hour' : 'day';

  let value;
  if (unit === 'hour') {
    if (subscription && subscription.reminderValue !== undefined && subscription.reminderValue !== null && !isNaN(Number(subscription.reminderValue))) {
      value = Number(subscription.reminderValue);
    } else if (subscription && subscription.reminderHours !== undefined && subscription.reminderHours !== null && !isNaN(Number(subscription.reminderHours))) {
      value = Number(subscription.reminderHours);
    } else {
      value = 0;
    }
  } else {
    if (subscription && subscription.reminderValue !== undefined && subscription.reminderValue !== null && !isNaN(Number(subscription.reminderValue))) {
      value = Number(subscription.reminderValue);
    } else if (!isNaN(defaultDays)) {
      value = Number(defaultDays);
    } else {
      value = 7;
    }
  }

  if (value < 0 || isNaN(value)) {
    value = 0;
  }

  return { unit, value };
}

function shouldTriggerReminder(reminder, daysDiff, hoursDiff) {
  if (!reminder) {
    return false;
  }
  if (reminder.unit === 'hour') {
    if (reminder.value === 0) {
      return hoursDiff >= 0 && hoursDiff < 1;
    }
    return hoursDiff >= 0 && hoursDiff <= reminder.value;
  }
  if (reminder.value === 0) {
    return daysDiff === 0;
  }
  return daysDiff >= 0 && daysDiff <= reminder.value;
}

function formatMatchedReminderRule(rule, locale = 'zh') {
  if (locale === 'en') {
    if (rule.type === 'on_expiry') return 'On expiry';
    if (rule.type === 'after_expiry') return `Every ${rule.repeatInterval || 24} hours after expiry`;
    if (rule.value === 0) return 'On expiry';
    const unit = rule.unit === 'hours' ? 'hour' : 'day';
    return `${rule.value} ${unit}${Number(rule.value) === 1 ? '' : 's'} before expiry`;
  }
  if (rule.type === 'on_expiry') return '到期当天';
  if (rule.type === 'after_expiry') {
    return `到期后每 ${rule.repeatInterval || 24} 小时`;
  }
  if (rule.value === 0) return rule.unit === 'hours' ? '到期当小时' : '到期当天';
  return `提前 ${rule.value} ${rule.unit === 'hours' ? '小时' : '天'}`;
}

function formatNotificationContent(subscriptions, config) {
  const showLunar = config.SHOW_LUNAR === true;
  const timezone = config?.TIMEZONE || 'UTC';
  const notificationLocale = getNotificationLocale(config);
  let content = '';

  for (const sub of subscriptions) {
    const typeText = localizeCustomTypeValue(sub.customType, notificationLocale) || getNotificationMessage('reminder_fallback_type', notificationLocale);
    const periodUnit = getNotificationMessage(`reminder_period_unit_${sub.periodUnit}`, notificationLocale);
    const periodText = (sub.periodValue && sub.periodUnit)
      ? ` (${getNotificationMessage('reminder_period_wrapper', notificationLocale, { value: sub.periodValue, unit: periodUnit })})`
      : '';
    const categoryText = sub.category ? localizeCategoryValue(sub.category, notificationLocale) : getNotificationMessage('reminder_fallback_category', notificationLocale);
    const reminderSetting = resolveReminderSetting(sub);

    const expiryDateObj = new Date(sub.expiryDate);
    const formattedExpiryDate = formatTimeInTimezone(expiryDateObj, timezone, 'date');

    let lunarExpiryText = '';
    if (showLunar) {
      const parts = getTimezoneDateParts(expiryDateObj, timezone);
      const lunarExpiry = lunarCalendar.solar2lunar(parts.year, parts.month, parts.day);
      lunarExpiryText = lunarExpiry ? `\n${getNotificationMessage('reminder_label_lunar_date', notificationLocale)}: ${lunarExpiry.fullStr}` : '';
    }

    let statusText = '';
    let statusEmoji = '';
    if (sub.daysRemaining === 0) {
      statusEmoji = '⚠️';
      statusText = getNotificationMessage('reminder_due_today', notificationLocale);
    } else if (sub.daysRemaining < 0) {
      statusEmoji = '🚨';
      statusText = getNotificationMessage('reminder_expired_days', notificationLocale, { days: Math.abs(sub.daysRemaining) });
    } else {
      statusEmoji = '📅';
      statusText = getNotificationMessage('reminder_due_in_days', notificationLocale, { days: sub.daysRemaining });
    }

    const reminderSuffix = reminderSetting.value === 0
      ? getNotificationMessage('reminder_suffix_due_only', notificationLocale)
      : (reminderSetting.unit === 'hour' ? getNotificationMessage('reminder_suffix_hour_level', notificationLocale) : '');
    const reminderText = sub.matchedReminderRule ? `${notificationLocale === 'zh' ? '提醒策略' : 'Reminder'}: ${formatMatchedReminderRule(sub.matchedReminderRule, notificationLocale)}` : reminderSetting.unit === 'hour'
      ? getNotificationMessage('reminder_strategy_hours', notificationLocale, { value: reminderSetting.value, suffix: reminderSuffix })
      : getNotificationMessage('reminder_strategy_days', notificationLocale, { value: reminderSetting.value, suffix: reminderSuffix });

    const calendarType = sub.useLunar
      ? getNotificationMessage('reminder_calendar_lunar', notificationLocale)
      : getNotificationMessage('reminder_calendar_solar', notificationLocale);
    const autoRenewText = sub.autoRenew
      ? getNotificationMessage('reminder_auto_renew_yes', notificationLocale)
      : getNotificationMessage('reminder_auto_renew_no', notificationLocale);
    const currencySymbols = {
      MYR: 'RM', CNY: '¥', USD: '$', HKD: 'HK$', TWD: 'NT$',
      JPY: '¥', EUR: '€', GBP: '£', KRW: '₩', TRY: '₺', KGS: 'сом'
    };
    const amountConfigured = sub.amount !== null && sub.amount !== undefined && !Number.isNaN(Number(sub.amount));
    const amountCurrency = currencySymbols[sub.currency || 'MYR'] || 'RM';
    const amountText = amountConfigured
      ? `\n${getNotificationMessage('reminder_label_amount', notificationLocale)}: ${amountCurrency}${Number(sub.amount).toFixed(2)}/${getNotificationMessage('reminder_amount_suffix', notificationLocale)}`
      : '';

    const subscriptionContent = `${statusEmoji} **${sub.name}**
${getNotificationMessage('reminder_label_type', notificationLocale)}: ${typeText}${periodText}
${getNotificationMessage('reminder_label_category', notificationLocale)}: ${categoryText}${amountText}
${getNotificationMessage('reminder_label_calendar_type', notificationLocale)}: ${calendarType}
${getNotificationMessage('reminder_label_expiry_date', notificationLocale)}: ${formattedExpiryDate}${lunarExpiryText}
${getNotificationMessage('reminder_label_auto_renew', notificationLocale)}: ${autoRenewText}
${reminderText}
${getNotificationMessage('reminder_label_status', notificationLocale)}: ${statusText}`;

    const finalContent = sub.notes ?
      subscriptionContent + `\n${getNotificationMessage('reminder_label_notes', notificationLocale)}: ${sub.notes}` :
      subscriptionContent;

    content += finalContent + '\n\n';
  }

  const currentTime = formatTimeInTimezone(new Date(), timezone, 'datetime');
  content += `${getNotificationMessage('reminder_sent_at', notificationLocale)}: ${currentTime}\n${getNotificationMessage('reminder_current_timezone', notificationLocale)}: ${formatTimezoneDisplay(timezone, notificationLocale)}`;

  return content;
}

export { resolveReminderSetting, shouldTriggerReminder, formatNotificationContent };
