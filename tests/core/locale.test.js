import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  UI_MESSAGES,
  normalizeUiLocale,
  getTimezoneDisplayName,
  getMessage
} from '../../src/core/locale.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localeSource = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'core', 'locale.js'), 'utf8');

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

test('getMessage returns localized second-wave admin, dashboard, and config strings', () => {
  assert.equal(getMessage('admin_search_placeholder', 'zh-CN'), '\u641c\u7d22\u540d\u79f0\u3001\u7c7b\u578b\u6216\u5907\u6ce8...');
  assert.equal(getMessage('admin_search_placeholder', 'en-US'), 'Search name, type, or notes...');
  assert.equal(getMessage('config_secret_configured', 'zh-CN'), '\u5df2\u914d\u7f6e\uff08\u5df2\u9690\u85cf\uff09');
  assert.equal(getMessage('config_secret_configured', 'en-US'), 'Configured (hidden)');
  assert.equal(getMessage('dashboard_scheduler_empty', 'zh-CN'), '\u6682\u65e0\u5b9a\u65f6\u4efb\u52a1\u6267\u884c\u8bb0\u5f55\uff08\u7b49\u5f85\u4e0b\u4e00\u6b21 Cron\uff09');
  assert.equal(getMessage('dashboard_scheduler_empty', 'en-US'), 'No scheduled job runs yet (waiting for the next Cron run)');
});

test('getMessage interpolates second-wave runtime strings', () => {
  assert.equal(getMessage('dashboard_upcoming_days_left', 'zh-CN', { count: 3 }), '3 \u5929\u540e');
  assert.equal(getMessage('dashboard_upcoming_days_left', 'en-US', { count: 3 }), 'In 3 days');
  assert.equal(getMessage('admin_delete_success', 'zh-CN', { name: 'Netflix' }), '\u5df2\u5220\u9664\uff1aNetflix');
  assert.equal(getMessage('admin_delete_success', 'en-US', { name: 'Netflix' }), 'Deleted: Netflix');
  assert.equal(getMessage('config_clear_secret_marked', 'zh-CN', { key: 'TG_BOT_TOKEN' }), '\u5df2\u6807\u8bb0\u6e05\u7a7a\uff1aTG_BOT_TOKEN\uff08\u4fdd\u5b58\u540e\u751f\u6548\uff09');
  assert.equal(getMessage('config_clear_secret_marked', 'en-US', { key: 'TG_BOT_TOKEN' }), 'Marked for clearing: TG_BOT_TOKEN (applies after saving)');
});

test('getMessage returns localized dashboard stats strings without mojibake placeholders', () => {
  assert.equal(getMessage('dashboard_stats_monthly_subtitle', 'zh-CN'), '本月折合支出');
  assert.equal(getMessage('dashboard_stats_yearly_spend', 'en-US'), 'Yearly Spend (MYR)');
  assert.equal(getMessage('dashboard_stats_active_subscriptions', 'en-US'), 'Active Subscriptions');
  assert.equal(getMessage('dashboard_stats_expiring_soon', 'zh-CN', { count: 2 }), '2 即将到期');
});

test('locale catalog includes shared scheduler and admin keys for both locales', () => {
  assert.equal(UI_MESSAGES.zh.dashboard_scheduler_last_run_label, '最近执行时间');
  assert.equal(UI_MESSAGES.en.dashboard_scheduler_last_run_label, 'Last Run Time');
  assert.equal(UI_MESSAGES.zh.dashboard_scheduler_status_label, '状态');
  assert.equal(UI_MESSAGES.en.dashboard_scheduler_status_label, 'Status');
  assert.equal(UI_MESSAGES.zh.config_admin_password_help, '留空表示不修改当前密码');
  assert.equal(UI_MESSAGES.en.config_admin_password_help, 'Leave blank to keep the current password');
  assert.equal(UI_MESSAGES.zh.config_notifier_webhook, 'Webhook 通知');
  assert.equal(UI_MESSAGES.en.config_notifier_webhook, 'Webhook Notification');
  assert.equal(UI_MESSAGES.zh.admin_status_expired, '已过期');
  assert.equal(UI_MESSAGES.en.admin_status_expired, 'Expired');
  assert.equal(UI_MESSAGES.zh.admin_edit_payment_title, '编辑支付记录');
  assert.equal(UI_MESSAGES.en.admin_edit_payment_title, 'Edit Payment Record');
});

test('getMessage returns shared scheduler labels and interpolated strings', () => {
  assert.equal(getMessage('dashboard_scheduler_last_run_label', 'zh-CN'), '最近执行时间');
  assert.equal(getMessage('dashboard_scheduler_last_run_label', 'en-US'), 'Last Run Time');
  assert.equal(getMessage('dashboard_scheduler_status_label', 'zh-CN'), '状态');
  assert.equal(getMessage('dashboard_scheduler_status_label', 'en-US'), 'Status');
  assert.equal(
    getMessage('dashboard_scheduler_checked_matches', 'zh-CN', { checked: 8, matched: 3 }),
    '检查 8 条，命中 3 条'
  );
  assert.equal(
    getMessage('dashboard_scheduler_checked_matches', 'en-US', { checked: 8, matched: 3 }),
    'Checked 8 subscriptions, matched 3'
  );
  assert.equal(getMessage('dashboard_stats_total_subscriptions', 'zh-CN', { count: 12 }), '总订阅数: 12');
  assert.equal(getMessage('dashboard_stats_total_subscriptions', 'en-US', { count: 12 }), 'Total subscriptions: 12');
});

test('getMessage returns shared config and admin strings', () => {
  assert.equal(getMessage('config_admin_password_help', 'zh-CN'), '留空表示不修改当前密码');
  assert.equal(getMessage('config_admin_password_help', 'en-US'), 'Leave blank to keep the current password');
  assert.equal(getMessage('config_notifier_webhook', 'zh-CN'), 'Webhook 通知');
  assert.equal(getMessage('config_notifier_webhook', 'en-US'), 'Webhook Notification');
  assert.equal(getMessage('config_notifier_serverchan', 'zh-CN'), 'Server酱');
  assert.equal(getMessage('config_notifier_serverchan', 'en-US'), 'ServerChan');
  assert.equal(getMessage('admin_status_expired', 'zh-CN'), '已过期');
  assert.equal(getMessage('admin_status_expired', 'en-US'), 'Expired');
  assert.equal(getMessage('admin_edit_payment_title', 'zh-CN'), '编辑支付记录');
  assert.equal(getMessage('admin_edit_payment_title', 'en-US'), 'Edit Payment Record');
});


test('getMessage returns localized admin modal and payment-flow strings', () => {
  assert.equal(getMessage('admin_modal_add_title', 'zh-CN'), '\u6dfb\u52a0\u65b0\u8ba2\u9605');
  assert.equal(getMessage('admin_modal_add_title', 'en-US'), 'Add Subscription');
  assert.equal(getMessage('admin_renew_payment_date', 'zh-CN'), '\u652f\u4ed8\u65e5\u671f');
  assert.equal(getMessage('admin_renew_payment_date', 'en-US'), 'Payment Date');
  assert.equal(getMessage('admin_payment_history_empty', 'zh-CN'), '\u6682\u65e0\u652f\u4ed8\u8bb0\u5f55');
  assert.equal(getMessage('admin_payment_history_empty', 'en-US'), 'No payment records yet');
  assert.equal(getMessage('admin_save_in_progress', 'zh-CN'), '\u4fdd\u5b58\u4e2d...');
  assert.equal(getMessage('admin_save_in_progress', 'en-US'), 'Saving...');
  assert.equal(getMessage('admin_date_invalid_format', 'zh-CN'), '\u65e5\u671f\u683c\u5f0f\u9700\u4e3a YYYY-MM-DD');
  assert.equal(getMessage('admin_date_invalid_value', 'en-US'), 'Please enter a valid date');
});

test('locale source keeps zh strings readable instead of unicode escape soup', () => {
  assert.equal(localeSource.includes('\\u641c\\u7d22\\u540d\\u79f0\\u3001\\u7c7b\\u578b'), false);
  assert.equal(localeSource.includes('\\u672c\\u6708\\u6298\\u5408\\u652f\\u51fa'), false);
  assert.equal(localeSource.includes('\\u5df2\\u914d\\u7f6e\\uff08\\u5df2\\u9690\\u85cf\\uff09'), false);
  assert.equal(localeSource.includes('\\u6700\\u8fd1\\u6267\\u884c\\u65f6\\u95f4'), false);
  assert.equal(localeSource.includes('\\u7559\\u7a7a\\u8868\\u793a\\u4e0d\\u4fee\\u6539\\u5f53\\u524d\\u5bc6\\u7801'), false);
  assert.equal(localeSource.includes('\\u5df2\\u8fc7\\u671f'), false);
});
