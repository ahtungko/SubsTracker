const DEFAULT_SERVER_LOCALE = 'en';

const SERVER_MESSAGES = {
  zh: {
    api_unauthorized: '未授权访问',
    api_not_found: '未找到请求的资源',
    login_invalid_credentials: '用户名或密码错误',
    config_update_failed_prefix: '更新配置失败: ',
    dashboard_fetch_failed_prefix: '获取统计数据失败: ',
    test_notification_missing_type: '缺少测试类型参数 type',
    test_notification_unsupported_type_prefix: '不支持的测试类型: ',
    test_notification_failed_prefix: '测试通知失败: ',
    subscription_not_found: '未找到该订阅',
    subscription_test_button_missing: '未找到测试按钮，请刷新页面后重试',
    subscription_test_missing_id: '订阅 ID 缺失，无法发送测试通知',
    subscription_fetch_failed: '获取订阅信息时发生错误',
    subscription_test_no_channels: '未启用任何通知渠道，请先在系统设置中至少开启一种通知方式。',
    subscription_test_failed_attempted: '测试通知发送失败，已尝试 {attempted} 个渠道',
    subscription_test_partial_success: '测试通知已发送：{successCount} 个成功，{failedCount} 个渠道失败',
    subscription_test_full_success: '测试通知发送成功（共 {successCount} 个渠道）',
    subscription_test_send_error_prefix: '发送时发生错误：',
    test_notification_success_template: '{service}发送成功',
    test_notification_failure_template: '{service}发送失败，请检查配置',
    test_notification_service_telegram: 'Telegram 通知',
    test_notification_service_notifyx: 'NotifyX 通知',
    test_notification_service_webhook: 'Webhook 通知',
    test_notification_service_wechatbot: '企业微信机器人通知',
    test_notification_service_email: '邮件通知',
    test_notification_service_bark: 'Bark 通知',
    test_notification_service_gotify: 'Gotify 通知',
    test_notification_service_serverchan: 'Server酱通知',
    test_notification_service_pushplus: 'PushPlus 通知',
    test_notification_service_discord: 'Discord 私信'
  },
  en: {
    api_unauthorized: 'Unauthorized access',
    api_not_found: 'Requested resource not found',
    login_invalid_credentials: 'Incorrect username or password',
    config_update_failed_prefix: 'Failed to update config: ',
    dashboard_fetch_failed_prefix: 'Failed to fetch dashboard stats: ',
    test_notification_missing_type: 'Missing required test type parameter: type',
    test_notification_unsupported_type_prefix: 'Unsupported test type: ',
    test_notification_failed_prefix: 'Test notification failed: ',
    subscription_not_found: 'Subscription not found',
    subscription_test_button_missing: 'Test button not found. Please refresh and try again.',
    subscription_test_missing_id: 'Subscription ID is missing, so the test notification cannot be sent.',
    subscription_fetch_failed: 'Failed to fetch subscription information',
    subscription_test_no_channels: 'No notification channels are enabled. Enable at least one notification method in Settings first.',
    subscription_test_failed_attempted: 'Test notification failed after attempting {attempted} channel(s)',
    subscription_test_partial_success: 'Test notification sent: {successCount} succeeded, {failedCount} channel(s) failed',
    subscription_test_full_success: 'Test notification sent successfully ({successCount} channel(s) total)',
    subscription_test_send_error_prefix: 'An error occurred while sending: ',
    test_notification_success_template: '{service} sent successfully',
    test_notification_failure_template: '{service} failed to send. Please check the configuration.',
    test_notification_service_telegram: 'Telegram notification',
    test_notification_service_notifyx: 'NotifyX notification',
    test_notification_service_webhook: 'Webhook notification',
    test_notification_service_wechatbot: 'WeCom bot notification',
    test_notification_service_email: 'Email notification',
    test_notification_service_bark: 'Bark notification',
    test_notification_service_gotify: 'Gotify notification',
    test_notification_service_serverchan: 'ServerChan notification',
    test_notification_service_pushplus: 'PushPlus notification',
    test_notification_service_discord: 'Discord direct message'
  }
};

function normalizeServerLocale(rawLocale) {
  if (typeof rawLocale !== 'string') return DEFAULT_SERVER_LOCALE;
  const locale = rawLocale.trim().toLowerCase();
  if (!locale) return DEFAULT_SERVER_LOCALE;
  if (locale === 'zh' || locale.startsWith('zh-')) return 'zh';
  if (locale === 'en' || locale.startsWith('en-')) return 'en';
  return DEFAULT_SERVER_LOCALE;
}

function extractRequestLocale(request) {
  return normalizeServerLocale(request.headers.get('X-Locale'));
}

function formatServerMessage(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, token) => (
    Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : `{${token}}`
  ));
}

function getServerMessage(key, locale = DEFAULT_SERVER_LOCALE, params) {
  const resolvedLocale = normalizeServerLocale(locale);
  const localizedMessages = SERVER_MESSAGES[resolvedLocale] || SERVER_MESSAGES[DEFAULT_SERVER_LOCALE] || {};
  const fallbackMessages = SERVER_MESSAGES[DEFAULT_SERVER_LOCALE] || {};
  const message = localizedMessages[key] || fallbackMessages[key] || key;
  return params ? formatServerMessage(message, params) : message;
}

export {
  DEFAULT_SERVER_LOCALE,
  SERVER_MESSAGES,
  formatServerMessage,
  normalizeServerLocale,
  extractRequestLocale,
  getServerMessage
};
