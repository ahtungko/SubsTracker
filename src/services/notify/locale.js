const DEFAULT_NOTIFICATION_LOCALE = 'en';

const NOTIFICATION_MESSAGES = {
  zh: {
    reminder_label_type: '类型',
    reminder_label_category: '分类',
    reminder_label_amount: '金额',
    reminder_label_calendar_type: '日历类型',
    reminder_label_expiry_date: '到期日期',
    reminder_label_auto_renew: '自动续期',
    reminder_label_status: '到期状态',
    reminder_label_notes: '备注',
    reminder_label_lunar_date: '农历日期',
    reminder_fallback_type: '其他',
    reminder_fallback_category: '未分类',
    reminder_period_wrapper: '周期: {value} {unit}',
    reminder_amount_suffix: '周期',
    reminder_period_unit_day: '天',
    reminder_period_unit_month: '月',
    reminder_period_unit_year: '年',
    reminder_due_today: '今天到期！',
    reminder_due_in_days: '将在 {days} 天后到期',
    reminder_expired_days: '已过期 {days} 天',
    reminder_strategy_days: '提醒策略: 提前 {value} 天{suffix}',
    reminder_strategy_hours: '提醒策略: 提前 {value} 小时{suffix}',
    reminder_suffix_due_only: '（仅到期时提醒）',
    reminder_suffix_hour_level: '（小时级提醒）',
    reminder_calendar_lunar: '农历',
    reminder_calendar_solar: '公历',
    reminder_auto_renew_yes: '是',
    reminder_auto_renew_no: '否',
    reminder_sent_at: '发送时间',
    reminder_current_timezone: '当前时区',
    notification_email_footer: '此邮件由订阅管理系统自动发送，请及时处理相关订阅事务。',
    notification_email_signature: '订阅管理系统',
    notification_test_title: '测试通知',
    notification_test_body_generic: '这是一条测试通知，用于验证 {service} 是否正常工作。',
    notification_service_discord: 'Discord Bot 私信功能',
    notification_service_email: '邮件通知功能',
    notification_scheduled_reminder_title: '订阅到期/续费提醒',
    notification_notifyx_description: '订阅提醒',
    webhook_tags_line: '标签: {tags}',
    webhook_sent_at_label: '发送时间'
  },
  en: {
    reminder_label_type: 'Type',
    reminder_label_category: 'Category',
    reminder_label_amount: 'Amount',
    reminder_label_calendar_type: 'Calendar type',
    reminder_label_expiry_date: 'Expiry date',
    reminder_label_auto_renew: 'Auto renew',
    reminder_label_status: 'Status',
    reminder_label_notes: 'Notes',
    reminder_label_lunar_date: 'Lunar date',
    reminder_fallback_type: 'Other',
    reminder_fallback_category: 'Uncategorized',
    reminder_period_wrapper: 'Billing cycle: {value} {unit}',
    reminder_amount_suffix: 'cycle',
    reminder_period_unit_day: 'day',
    reminder_period_unit_month: 'month',
    reminder_period_unit_year: 'year',
    reminder_due_today: 'Due today!',
    reminder_due_in_days: 'Due in {days} day(s)',
    reminder_expired_days: 'Expired {days} day(s) ago',
    reminder_strategy_days: 'Reminder strategy: {value} day(s) in advance{suffix}',
    reminder_strategy_hours: 'Reminder strategy: {value} hour(s) in advance{suffix}',
    reminder_suffix_due_only: ' (only when due)',
    reminder_suffix_hour_level: ' (hour-level reminder)',
    reminder_calendar_lunar: 'Lunar',
    reminder_calendar_solar: 'Solar',
    reminder_auto_renew_yes: 'Yes',
    reminder_auto_renew_no: 'No',
    reminder_sent_at: 'Sent at',
    reminder_current_timezone: 'Current timezone',
    notification_email_footer: 'This email was sent automatically by Subscription Manager. Please review the related subscription soon.',
    notification_email_signature: 'Subscription Manager',
    notification_test_title: 'Test notification',
    notification_test_body_generic: 'This is a test notification used to verify that {service} is working correctly.',
    notification_service_discord: 'Discord Bot DM notifications',
    notification_service_email: 'email notifications',
    notification_scheduled_reminder_title: 'Subscription expiry/renewal reminder',
    notification_notifyx_description: 'Subscription reminder',
    webhook_tags_line: 'Tags: {tags}',
    webhook_sent_at_label: 'Sent at'
  }
};

function normalizeNotificationLocale(rawLocale) {
  if (typeof rawLocale !== 'string') return DEFAULT_NOTIFICATION_LOCALE;
  const locale = rawLocale.trim().toLowerCase();
  return locale === 'zh' ? 'zh' : 'en';
}

function getNotificationLocale(config) {
  return normalizeNotificationLocale(config?.NOTIFICATION_LOCALE);
}

function interpolateTemplate(template, params = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

function getNotificationMessage(key, locale = DEFAULT_NOTIFICATION_LOCALE, params = {}) {
  const resolvedLocale = normalizeNotificationLocale(locale);
  const localizedMessages = NOTIFICATION_MESSAGES[resolvedLocale] || NOTIFICATION_MESSAGES[DEFAULT_NOTIFICATION_LOCALE] || {};
  const fallbackMessages = NOTIFICATION_MESSAGES[DEFAULT_NOTIFICATION_LOCALE] || {};
  const template = localizedMessages[key] || fallbackMessages[key] || key;
  return interpolateTemplate(template, params);
}

export {
  DEFAULT_NOTIFICATION_LOCALE,
  NOTIFICATION_MESSAGES,
  normalizeNotificationLocale,
  getNotificationLocale,
  getNotificationMessage,
  interpolateTemplate
};
