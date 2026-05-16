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

const UI_MESSAGES = {
  zh: {
    app_name: '订阅管理系统',
    page_title_dashboard: '仪表盘 - SubsTracker',
    page_title_admin: '订阅管理系统',
    page_title_config: '系统配置 - 订阅管理系统',
    page_title_login: '登录 - 订阅管理系统',
    login_heading: '订阅管理系统',
    login_subtitle: '登录管理您的订阅提醒',
    login_label_username: '用户名',
    login_label_password: '密码',
    login_submit: '登录',
    login_submitting: '登录中...',
    login_error_invalid_credentials: '用户名或密码错误',
    login_error_generic: '发生错误，请稍后再试',
    aria_toggle_navigation_menu: '切换导航菜单',
    nav_dashboard: '仪表盘',
    nav_subscriptions: '订阅列表',
    nav_settings: '系统配置',
    nav_logout: '退出登录',
    dashboard_page_heading: '📊 仪表板',
    dashboard_page_subtitle: '订阅费用和活动概览（统计金额已折合为 MYR）',
    dashboard_section_scheduler_status: '自动提醒任务状态',
    dashboard_badge_cron_observability: 'Cron 可观测性',
    dashboard_section_recent_payments: '最近支付',
    dashboard_badge_last_7_days: '过去7天',
    dashboard_section_upcoming_renewals: '即将续费',
    dashboard_badge_next_7_days: '未来7天',
    dashboard_section_scheduler_history: '自动提醒任务历史（最近10次）',
    dashboard_section_expense_by_type: '按类型支出排行',
    dashboard_badge_yearly_summary_myr: '年度统计 (折合MYR)',
    dashboard_section_expense_by_category: '按分类支出统计',
    admin_page_heading: '订阅列表',
    admin_page_subtitle: '使用搜索与分类快速定位订阅，开启农历显示可同时查看农历日期',
    admin_add_subscription: '添加新订阅',
    config_page_heading: '系统配置',
    config_section_admin_account: '管理员账户',
    config_label_admin_username: '用户名',
    config_label_admin_password: '密码',
    config_section_display_settings: '显示设置',
    config_label_theme_mode: '主题模式',
    config_theme_light: '🌞 浅色模式',
    config_theme_dark: '🌙 暗黑模式',
    config_theme_system: '🖥️ 跟随系统',
    config_show_lunar: '在通知中显示农历日期',
    config_show_lunar_help: '控制是否在通知消息中包含农历日期信息',
    config_section_timezone_settings: '时区设置',
    config_label_timezone: '时区选择',
    config_timezone_help: '该项仅用于兼容旧配置与展示参考；后端调度与提醒计算统一使用 UTC，页面时间始终按当前设备时区显示。',
    config_section_notification_settings: '通知设置',
    config_label_notification_hours: '通知时段（UTC）',
    config_notification_hours_help: '可输入多个小时，使用逗号或空格分隔；留空则默认每天执行一次任务即可',
    config_notification_hint_title: '提示',
    config_notification_hint_body_1: '后台统一按 UTC 判断通知时段。示例：北京时间 08:00 对应 UTC 00，请在此填 00。',
    config_notification_hint_body_2: '若 Cron 已设置为每小时执行，可用该字段限制实际发送提醒的小时段。',
    config_save: '保存设置',
    config_save_in_progress: '保存中...',
    config_save_success: '配置保存成功',
    config_save_failed_unknown: '配置保存失败：未知错误',
    config_save_failed_retry: '保存配置失败，请稍后再试',
    admin_test_button_missing: '未找到测试按钮，请刷新页面后重试',
    admin_test_missing_subscription_id: '订阅 ID 缺失，无法发送测试通知',
    admin_test_network_error: '发送测试通知时发生网络错误，请稍后重试',
    test_notification_invalid_response: '服务返回了无法解析的响应',
    test_notification_http_prefix: 'HTTP ',
    config_test_gotify_server_required: '请先填写 Gotify Server URL',
    config_test_discord_user_id_required: '请先填写 Discord 用户 ID',
    admin_fetch_subscription_failed: '获取订阅信息失败',
    dashboard_load_failed: '加载失败',
    dashboard_load_failed_prefix: '加载失败:'
  },
  en: {
    app_name: 'Subscription Manager',
    page_title_dashboard: 'Dashboard - SubsTracker',
    page_title_admin: 'Subscription Manager',
    page_title_config: 'Settings - Subscription Manager',
    page_title_login: 'Login - Subscription Manager',
    login_heading: 'Subscription Manager',
    login_subtitle: 'Sign in to manage your subscription reminders',
    login_label_username: 'Username',
    login_label_password: 'Password',
    login_submit: 'Sign In',
    login_submitting: 'Signing in...',
    login_error_invalid_credentials: 'Incorrect username or password',
    login_error_generic: 'Something went wrong. Please try again later',
    aria_toggle_navigation_menu: 'Toggle navigation menu',
    nav_dashboard: 'Dashboard',
    nav_subscriptions: 'Subscriptions',
    nav_settings: 'Settings',
    nav_logout: 'Log Out',
    dashboard_page_heading: '📊 Dashboard',
    dashboard_page_subtitle: 'Subscription costs and activity overview (all totals converted to MYR)',
    dashboard_section_scheduler_status: 'Reminder Job Status',
    dashboard_badge_cron_observability: 'Cron Observability',
    dashboard_section_recent_payments: 'Recent Payments',
    dashboard_badge_last_7_days: 'Last 7 Days',
    dashboard_section_upcoming_renewals: 'Upcoming Renewals',
    dashboard_badge_next_7_days: 'Next 7 Days',
    dashboard_section_scheduler_history: 'Reminder Job History (Last 10 Runs)',
    dashboard_section_expense_by_type: 'Spending by Type',
    dashboard_badge_yearly_summary_myr: 'Yearly Summary (MYR)',
    dashboard_section_expense_by_category: 'Spending by Category',
    admin_page_heading: 'Subscriptions',
    admin_page_subtitle: 'Use search and categories to find subscriptions quickly, and enable lunar display to see lunar dates too',
    admin_add_subscription: 'Add Subscription',
    config_page_heading: 'Settings',
    config_section_admin_account: 'Admin Account',
    config_label_admin_username: 'Username',
    config_label_admin_password: 'Password',
    config_section_display_settings: 'Display Settings',
    config_label_theme_mode: 'Theme Mode',
    config_theme_light: '🌞 Light Mode',
    config_theme_dark: '🌙 Dark Mode',
    config_theme_system: '🖥️ Follow System',
    config_show_lunar: 'Show lunar dates in notifications',
    config_show_lunar_help: 'Controls whether lunar-date information is included in notification messages',
    config_section_timezone_settings: 'Timezone Settings',
    config_label_timezone: 'Timezone',
    config_timezone_help: 'This field is only kept for legacy compatibility and display reference; backend scheduling and reminder calculations use UTC, while page time always follows the current device timezone.',
    config_section_notification_settings: 'Notification Settings',
    config_label_notification_hours: 'Notification Hours (UTC)',
    config_notification_hours_help: 'Enter one or more hours separated by commas or spaces; leave blank to keep the default once-per-day job behavior',
    config_notification_hint_title: 'Tip',
    config_notification_hint_body_1: 'The backend always evaluates notification windows in UTC. Example: 08:00 Beijing time corresponds to UTC 00, so enter 00 here.',
    config_notification_hint_body_2: 'If Cron runs hourly, you can use this field to limit which hours actually send reminders.',
    config_save: 'Save Settings',
    config_save_in_progress: 'Saving...',
    config_save_success: 'Settings saved',
    config_save_failed_unknown: 'Settings save failed: Unknown error',
    config_save_failed_retry: 'Failed to save settings. Please try again later.',
    admin_test_button_missing: 'Test button not found. Please refresh and try again.',
    admin_test_missing_subscription_id: 'Subscription ID is missing, so the test notification cannot be sent.',
    admin_test_network_error: 'A network error occurred while sending the test notification. Please try again later.',
    test_notification_invalid_response: 'The server returned a response that could not be parsed.',
    test_notification_http_prefix: 'HTTP ',
    config_test_gotify_server_required: 'Please enter the Gotify Server URL first.',
    config_test_discord_user_id_required: 'Please enter the Discord user ID first.',
    admin_fetch_subscription_failed: 'Failed to fetch subscription information',
    dashboard_load_failed: 'Failed to load',
    dashboard_load_failed_prefix: 'Failed to load:'
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

function getMessage(key, locale = DEFAULT_UI_LOCALE) {
  const resolvedLocale = normalizeUiLocale(locale);
  const localizedMessages = UI_MESSAGES[resolvedLocale] || UI_MESSAGES[DEFAULT_UI_LOCALE] || {};
  const fallbackMessages = UI_MESSAGES[DEFAULT_UI_LOCALE] || {};

  return localizedMessages[key] || fallbackMessages[key] || key;
}

export {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  UI_MESSAGES,
  normalizeUiLocale,
  getTimezoneDisplayName,
  getMessage
};
