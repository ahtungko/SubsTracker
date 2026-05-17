import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const runtimeJsPath = path.join(repoRoot, 'src/views/browser-locale-resources.js');
const dashboardPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/dashboardPage.html'), 'utf8');
const adminPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/adminPage.html'), 'utf8');
const configPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/configPage.html'), 'utf8');
const loginPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/loginPage.html'), 'utf8');
const localeSource = fs.readFileSync(path.join(repoRoot, 'src/core/locale.js'), 'utf8');
const LOCALISED_SOURCE_FILES = new Map([
  ['src/core/locale.js', localeSource],
  ['src/views/dashboardPage.html', dashboardPageHtml],
  ['src/views/adminPage.html', adminPageHtml],
  ['src/views/configPage.html', configPageHtml],
  ['src/views/loginPage.html', loginPageHtml]
]);
const MOJIBAKE_CODE_POINTS = new Set([0x00c2, 0x00c3, 0x00d0, 0x00d1, 0x00e2, 0x00e4, 0x00e5, 0x00e6, 0x00e8, 0x00e9, 0x00f0, 0xfffd]);

function containsMojibake(source) {
  for (const char of source) {
    if (MOJIBAKE_CODE_POINTS.has(char.codePointAt(0))) {
      return true;
    }
  }
  return false;
}

function stripScriptTags(scriptHtml) {
  const match = scriptHtml.match(/^<script>\s*([\s\S]*)\s*<\/script>$/);
  assert.ok(match, 'expected buildBrowserLocaleResources() to return one inline <script> block');
  return match[1];
}

test('browser locale runtime exposes getMessage and applyTranslations', async () => {
  const runtimeModule = await import(pathToFileURL(runtimeJsPath).href + `?t=${Date.now()}`);
  const scriptHtml = runtimeModule.buildBrowserLocaleResources();
  const scriptSource = stripScriptTags(scriptHtml);

  new vm.Script(scriptSource, { filename: 'browser-ui-localisation-runtime.js' });

  const translatedNodes = [
    {
      dataset: { i18n: 'nav_dashboard' },
      textContent: '\u4eea\u8868\u76d8',
      getAttribute(name) {
        return name === 'data-i18n' ? this.dataset.i18n : null;
      }
    },
    {
      dataset: { i18n: 'config_save' },
      textContent: '\u4fdd\u5b58\u8bbe\u7f6e',
      getAttribute(name) {
        return name === 'data-i18n' ? this.dataset.i18n : null;
      }
    },
    {
      dataset: { i18nAriaLabel: 'aria_toggle_navigation_menu' },
      attributes: { 'aria-label': '\u5207\u6362\u5bfc\u822a\u83dc\u5355' },
      getAttribute(name) {
        if (name === 'data-i18n-aria-label') return this.dataset.i18nAriaLabel;
        return this.attributes[name] || null;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    },
    {
      dataset: { i18nTitle: 'page_title_dashboard' },
      attributes: { title: '\u4eea\u8868\u76d8 - SubsTracker' },
      getAttribute(name) {
        if (name === 'data-i18n-title') return this.dataset.i18nTitle;
        return this.attributes[name] || null;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    },
    {
      dataset: { i18nPlaceholder: 'admin_search_placeholder' },
      attributes: { placeholder: '\u641c\u7d22\u540d\u79f0\u3001\u7c7b\u578b\u6216\u5907\u6ce8...' },
      getAttribute(name) {
        if (name === 'data-i18n-placeholder') return this.dataset.i18nPlaceholder;
        return this.attributes[name] || null;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    }
  ];

  const documentStub = {
    title: '\u4eea\u8868\u76d8 - SubsTracker',
    documentElement: { lang: 'zh-CN' },
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') {
        return translatedNodes.filter(node => node.dataset?.i18n);
      }
      if (selector === '[data-i18n-aria-label]') {
        return translatedNodes.filter(node => node.dataset?.i18nAriaLabel);
      }
      if (selector === '[data-i18n-title]') {
        return translatedNodes.filter(node => node.dataset?.i18nTitle);
      }
      if (selector === '[data-i18n-placeholder]') {
        return translatedNodes.filter(node => node.dataset?.i18nPlaceholder);
      }
      throw new Error('Unexpected selector: ' + selector);
    }
  };

  const sandbox = {
    window: { Object },
    document: documentStub,
    navigator: { language: 'en-US', languages: ['en-US'] },
    Intl,
    Date,
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox, { filename: 'browser-ui-localisation-runtime.js' });

  const { AppLocale } = sandbox.window;
  assert.equal(typeof AppLocale.getMessage, 'function');
  assert.equal(typeof AppLocale.applyTranslations, 'function');
  assert.equal(typeof AppLocale.applyDocumentMetadata, 'function');
  assert.equal(typeof AppLocale.getRequestHeaders, 'function');
  assert.deepEqual(AppLocale.getRequestHeaders('zh-CN'), { 'X-Locale': 'zh' });
  assert.deepEqual(AppLocale.getRequestHeaders('en-US'), { 'X-Locale': 'en' });
  assert.deepEqual(AppLocale.getRequestHeaders('ja-JP'), { 'X-Locale': 'en' });
  assert.equal(AppLocale.getMessage('nav_dashboard', 'zh-CN'), '\u4eea\u8868\u76d8');
  assert.equal(AppLocale.getMessage('nav_dashboard', 'en-US'), 'Dashboard');
  assert.equal(AppLocale.getMessage('dashboard_upcoming_days_left', 'en-US', { count: 5 }), 'In 5 days');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_current_hour_all', 'zh-CN'), '\u5168\u90e8\u65f6\u6bb5');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_current_hour_all', 'en-US'), 'All hours');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_sent_badge', 'zh-CN'), '\u672c\u6b21\u6709\u53d1\u9001');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_sent_badge', 'en-US'), 'Sent this run');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_not_sent_badge', 'zh-CN'), '\u672c\u6b21\u672a\u53d1\u9001');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_not_sent_badge', 'en-US'), 'No send this run');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_send_result_label', 'zh-CN'), '\u53d1\u9001\u7ed3\u679c');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_send_result_label', 'en-US'), 'Send Result');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_no_details', 'zh-CN'), '\u6682\u65e0\u8be6\u60c5');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_no_details', 'en-US'), 'No details yet');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_history_unknown_time', 'zh-CN'), '\u672a\u77e5\u65f6\u95f4');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_history_unknown_time', 'en-US'), 'Unknown time');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_checked_matches_label', 'zh-CN'), '\u68c0\u67e5\u4e0e\u547d\u4e2d');
  assert.equal(AppLocale.getMessage('dashboard_scheduler_checked_matches_label', 'en-US'), 'Checks & Matches');
  assert.equal(AppLocale.getMessage('missing_key', 'zh-CN'), 'missing_key');

  assert.doesNotThrow(() => AppLocale.applyDocumentMetadata());
  assert.equal(documentStub.title, '仪表盘 - SubsTracker');
  assert.equal(documentStub.documentElement.lang, 'en');

  AppLocale.applyDocumentMetadata({ titleKey: 'page_title_dashboard' }, documentStub, 'en-US');
  AppLocale.applyTranslations(documentStub, 'en-US');

  assert.equal(translatedNodes[0].textContent, 'Dashboard');
  assert.equal(translatedNodes[1].textContent, 'Save Settings');
  assert.equal(translatedNodes[2].attributes['aria-label'], 'Toggle navigation menu');
  assert.equal(translatedNodes[3].attributes.title, 'Dashboard - SubsTracker');
  assert.equal(translatedNodes[4].attributes.placeholder, 'Search name, type, or notes...');
  assert.equal(documentStub.title, 'Dashboard - SubsTracker');
  assert.equal(documentStub.documentElement.lang, 'en');
});

test('config page runtime renders full-phrase Task 3 localisation strings in English', async () => {
  const runtimeModule = await import(pathToFileURL(runtimeJsPath).href + `?t=${Date.now()}`);
  const scriptSource = stripScriptTags(runtimeModule.buildBrowserLocaleResources());

  const translatedNodes = [
    { key: 'config_admin_password_help', expected: 'Leave blank to keep the current password' },
    { key: 'config_theme_help', expected: 'Choose the visual appearance used by the app' },
    { key: 'config_notifier_webhook', expected: 'Webhook Notification' },
    { key: 'config_notifier_wechatbot', expected: 'WeCom Bot' },
    { key: 'config_notifier_email', expected: 'Email Notification' },
    { key: 'config_notifier_serverchan', expected: 'ServerChan' },
    { key: 'config_link_wechatbot_docs', expected: 'WeCom Bot Docs' },
    { key: 'config_section_webhook_title', expected: 'Webhook Notification Settings' },
    { key: 'config_test_webhook', expected: 'Test Webhook Notification' },
    { key: 'config_section_wechatbot_title', expected: 'WeCom Bot Settings' },
    { key: 'config_test_wechatbot', expected: 'Test WeCom Bot' },
    { key: 'config_section_email_title', expected: 'Email Notification Settings' },
    { key: 'config_test_email', expected: 'Test Email Notification' }
  ].map(({ key, expected }) => ({
    dataset: { i18n: key },
    textContent: key,
    expected,
    getAttribute(name) {
      return name === 'data-i18n' ? this.dataset.i18n : null;
    }
  }));

  const documentStub = {
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') {
        return translatedNodes;
      }
      return [];
    }
  };

  const sandbox = {
    window: { Object },
    document: documentStub,
    navigator: { language: 'en-US', languages: ['en-US'] },
    Intl,
    Date,
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox, { filename: 'browser-ui-localisation-runtime.js' });

  sandbox.window.AppLocale.applyTranslations(documentStub, 'en-US');

  for (const node of translatedNodes) {
    assert.equal(node.textContent, node.expected);
  }
});

test('dashboard first-wave static labels use data-i18n and call applyTranslations', () => {
  assert.equal(dashboardPageHtml.includes('data-i18n="app_name"'), true);
  assert.equal(dashboardPageHtml.includes('data-i18n="nav_dashboard"'), true);
  assert.equal(dashboardPageHtml.includes('data-i18n="nav_subscriptions"'), true);
  assert.equal(dashboardPageHtml.includes('data-i18n="nav_settings"'), true);
  assert.equal(dashboardPageHtml.includes('data-i18n="nav_logout"'), true);
  assert.equal(dashboardPageHtml.includes('data-i18n="dashboard_page_heading"'), true);
  assert.equal(dashboardPageHtml.includes('data-i18n="dashboard_page_subtitle"'), true);
  assert.equal(dashboardPageHtml.includes('data-i18n="dashboard_section_recent_payments"'), true);
  assert.equal(dashboardPageHtml.includes('data-i18n="dashboard_section_upcoming_renewals"'), true);
  assert.equal(dashboardPageHtml.split('data-i18n="dashboard_badge_yearly_summary_myr"').length - 1, 2);
  assert.equal(dashboardPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});

test('admin first-wave static labels use data-i18n and call applyTranslations', () => {
  assert.equal(adminPageHtml.includes('data-i18n="app_name"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="nav_dashboard"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="nav_subscriptions"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="nav_settings"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="nav_logout"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_page_heading"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_page_subtitle"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_add_subscription"'), true);
  assert.equal(adminPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});

test('config first-wave static labels use data-i18n and call applyTranslations', () => {
  assert.equal(configPageHtml.includes('data-i18n="app_name"'), true);
  assert.equal(configPageHtml.includes('data-i18n="nav_dashboard"'), true);
  assert.equal(configPageHtml.includes('data-i18n="nav_subscriptions"'), true);
  assert.equal(configPageHtml.includes('data-i18n="nav_settings"'), true);
  assert.equal(configPageHtml.includes('data-i18n="nav_logout"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_page_heading"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_section_admin_account"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_label_admin_username"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_label_admin_password"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_section_display_settings"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_label_theme_mode"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_theme_light"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_theme_dark"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_theme_system"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_show_lunar"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_show_lunar_help"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_section_timezone_settings"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_label_timezone"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_timezone_help"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_section_notification_settings"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_label_notification_hours"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notification_hours_help"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notification_hint_title"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notification_hint_body_1"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notification_hint_body_2"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_save"'), true);
  assert.equal(configPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});


test('admin localises title metadata and mobile-menu aria-label', () => {
  assert.equal(adminPageHtml.includes('data-i18n-aria-label="aria_toggle_navigation_menu"'), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_admin' });"), true);
  assert.equal(adminPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});


test('dashboard localises title metadata and mobile-menu aria-label', () => {
  assert.equal(dashboardPageHtml.includes('<html lang="en">'), false);
  assert.equal(dashboardPageHtml.includes('data-i18n-aria-label="aria_toggle_navigation_menu"'), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_dashboard' });"), true);
  assert.equal(dashboardPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});

test('config localises title metadata and mobile-menu aria-label', () => {
  assert.equal(configPageHtml.includes('data-i18n-aria-label="aria_toggle_navigation_menu"'), true);
  assert.equal(configPageHtml.includes("window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_config' });"), true);
  assert.equal(configPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});

test('login page localises title metadata and static body labels', () => {
  assert.equal(loginPageHtml.includes('data-i18n="login_heading"'), true);
  assert.equal(loginPageHtml.includes('data-i18n="login_subtitle"'), true);
  assert.equal(loginPageHtml.includes('data-i18n="login_label_username"'), true);
  assert.equal(loginPageHtml.includes('data-i18n="login_label_password"'), true);
  assert.equal(loginPageHtml.includes('data-i18n="login_submit"'), true);
  assert.equal(loginPageHtml.includes("window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_login' });"), true);
  assert.equal(loginPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});

test('login page inline script still compiles after localisation changes', () => {
  const match = loginPageHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'expected login page HTML to contain an inline script');
  assert.doesNotThrow(() => new Function(match[1]));
});

test('login page dynamic submit and error messages follow zh-CN locale', async () => {
  const runtimeModule = await import(pathToFileURL(runtimeJsPath).href + `?t=${Date.now()}`);
  const runtimeScript = stripScriptTags(runtimeModule.buildBrowserLocaleResources());
  const loginScriptMatch = loginPageHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(loginScriptMatch, 'expected login page HTML to contain an inline script');

  async function runLoginAttempt(fetchBehavior) {
    const usernameInput = { value: 'demo' };
    const passwordInput = { value: 'secret' };
    const button = { innerHTML: 'Sign In', disabled: false };
    const errorMsg = { textContent: '' };
    let submittingText = '';
    const form = {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      },
      querySelector(selector) {
        return selector === 'button' ? button : null;
      }
    };

    const documentStub = {
      title: '',
      documentElement: { lang: 'en' },
      getElementById(id) {
        if (id === 'loginForm') return form;
        if (id === 'username') return usernameInput;
        if (id === 'password') return passwordInput;
        if (id === 'errorMsg') return errorMsg;
        throw new Error(`Unexpected element id: ${id}`);
      },
      querySelectorAll() {
        return [];
      }
    };

    const sandbox = {
      window: { Object, location: { href: '' } },
      document: documentStub,
      navigator: { language: 'zh-CN', languages: ['zh-CN'] },
      Intl,
      Date,
      console,
      fetch: async (...args) => {
        submittingText = button.innerHTML;
        return fetchBehavior(...args);
      }
    };

    vm.createContext(sandbox);
    vm.runInContext(runtimeScript, sandbox, { filename: 'browser-ui-localisation-runtime.js' });
    assert.equal(sandbox.window.AppLocale.getPreferredLocale(), 'zh');

    vm.runInContext(loginScriptMatch[1], sandbox, { filename: 'login-page-inline-script.js' });

    assert.equal(typeof form.listeners.submit, 'function');
    await form.listeners.submit({
      preventDefault() {},
      target: form
    });

    return { button, errorMsg, submittingText, documentStub, sandbox };
  }

  const invalidCredentialsResult = await runLoginAttempt(async () => ({
    json: async () => ({ success: false })
  }));
  assert.equal(
    invalidCredentialsResult.submittingText.includes(
      invalidCredentialsResult.sandbox.window.AppLocale.getMessage('login_submitting', 'zh-CN')
    ),
    true
  );
  assert.equal(invalidCredentialsResult.button.innerHTML, 'Sign In');
  assert.equal(invalidCredentialsResult.button.disabled, false);
  assert.equal(
    invalidCredentialsResult.errorMsg.textContent,
    invalidCredentialsResult.sandbox.window.AppLocale.getMessage('login_error_invalid_credentials', 'zh-CN')
  );

  const genericErrorResult = await runLoginAttempt(async () => {
    throw new Error('network failure');
  });
  assert.equal(
    genericErrorResult.submittingText.includes(
      genericErrorResult.sandbox.window.AppLocale.getMessage('login_submitting', 'zh-CN')
    ),
    true
  );
  assert.equal(genericErrorResult.button.innerHTML, 'Sign In');
  assert.equal(genericErrorResult.button.disabled, false);
  assert.equal(
    genericErrorResult.errorMsg.textContent,
    genericErrorResult.sandbox.window.AppLocale.getMessage('login_error_generic', 'zh-CN')
  );
});



test('browser runtime request headers are used in login/config fetch paths', () => {
  assert.equal(loginPageHtml.includes('window.AppLocale.getRequestHeaders('), true);
  assert.equal(configPageHtml.includes('window.AppLocale.getRequestHeaders('), true);
});

test('browser runtime request headers are used in admin/dashboard fetch paths', () => {
  assert.equal(adminPageHtml.includes('window.AppLocale.getRequestHeaders('), true);
  assert.equal(dashboardPageHtml.includes('window.AppLocale.getRequestHeaders('), true);
});

test('dashboard scheduler runtime renders localized scheduler states and interpolated values', async () => {
  const runtimeModule = await import(pathToFileURL(runtimeJsPath).href + `?t=${Date.now()}`);
  const runtimeScript = stripScriptTags(runtimeModule.buildBrowserLocaleResources());
  const dashboardScriptMatch = dashboardPageHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(dashboardScriptMatch, 'expected dashboard page HTML to contain an inline script');

  function createElement(initial = {}) {
    return {
      innerHTML: initial.innerHTML || '',
      textContent: initial.textContent || '',
      listeners: {},
      attributes: {},
      classList: {
        contains() { return false; },
        add() {},
        remove() {},
        toggle() {}
      },
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      getAttribute(name) {
        return this.attributes[name] || null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      contains() {
        return false;
      },
      ...initial
    };
  }

  const elements = {
    schedulerStatus: createElement(),
    schedulerStatusHistory: createElement(),
    statsGrid: createElement(),
    recentPayments: createElement(),
    upcomingRenewals: createElement(),
    expenseByType: createElement(),
    expenseByCategory: createElement(),
    systemTimeDisplay: createElement(),
    mobileTimeDisplay: createElement(),
    'mobile-menu-btn': createElement({ querySelector() { return null; } }),
    'mobile-menu': createElement({ querySelectorAll() { return []; } })
  };

  let fetchPayload = {
    success: true,
    data: {
      schedulerStatus: null,
      schedulerStatusHistory: [],
      monthlyExpense: { amount: 0, trendDirection: 'flat', trend: 0 },
      yearlyExpense: { amount: 0, monthlyAverage: 0 },
      activeSubscriptions: { active: 0, total: 0, expiringSoon: 0 },
      recentPayments: [],
      upcomingRenewals: [],
      expenseByType: [],
      expenseByCategory: []
    }
  };

  const documentStub = {
    title: '',
    documentElement: { lang: 'en' },
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {}
  };

  const sandbox = {
    window: { Object },
    document: documentStub,
    navigator: { language: 'en-US', languages: ['en-US'] },
    Intl,
    Date,
    console,
    setInterval() { return 0; },
    clearInterval() {},
    fetch: async () => ({
      json: async () => fetchPayload
    })
  };

  vm.createContext(sandbox);
  vm.runInContext(runtimeScript, sandbox, { filename: 'browser-ui-localisation-runtime.js' });
  vm.runInContext(dashboardScriptMatch[1], sandbox, { filename: 'dashboard-page-inline-script.js' });
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(elements.schedulerStatus.innerHTML.includes('No scheduled job runs yet'), true);
  assert.equal(elements.schedulerStatusHistory.innerHTML.includes('No history records yet'), true);

  fetchPayload = {
    success: true,
    data: {
      schedulerStatus: {
        lastRunAt: null,
        configuredHours: [],
        currentHour: 0,
        sent: false,
        checkedSubscriptions: 4,
        expiringMatched: 2,
        dedupeSkipped: 3,
        sendResult: { attempted: 2, successCount: 1, failedCount: 1 },
        reason: ''
      },
      schedulerStatusHistory: [
        { lastRunAt: null, sent: false, reason: '' }
      ],
      monthlyExpense: { amount: 0, trendDirection: 'flat', trend: 0 },
      yearlyExpense: { amount: 0, monthlyAverage: 0 },
      activeSubscriptions: { active: 0, total: 0, expiringSoon: 0 },
      recentPayments: [],
      upcomingRenewals: [],
      expenseByType: [],
      expenseByCategory: []
    }
  };

  await vm.runInContext('loadDashboardData()', sandbox, { filename: 'dashboard-page-inline-script.js' });

  assert.equal(elements.schedulerStatus.innerHTML.includes('0 / All hours'), true);
  assert.equal(elements.schedulerStatus.innerHTML.includes('Checked 4 subscriptions, matched 2'), true);
  assert.equal(elements.schedulerStatus.innerHTML.includes('Attempted 2 channels, succeeded 1, failed 1, dedupe skipped 3'), true);
  assert.equal(elements.schedulerStatus.innerHTML.includes('Unknown time'), true);
  assert.equal(elements.schedulerStatus.innerHTML.includes('No send this run'), true);
  assert.equal(elements.schedulerStatus.innerHTML.includes('No details yet'), true);
  assert.equal(elements.schedulerStatusHistory.innerHTML.includes('Unknown time'), true);
  assert.equal(elements.schedulerStatusHistory.innerHTML.includes('Not sent'), true);
  assert.equal(elements.schedulerStatusHistory.innerHTML.includes('No details yet'), true);
  assert.equal(elements.schedulerStatus.innerHTML.includes('\u5168\u90e8\u65f6\u6bb5'), false);
  assert.equal(elements.schedulerStatus.innerHTML.includes('\u672c\u6b21\u672a\u53d1\u9001'), false);
});


test('admin page localises remaining browser-only error toasts via AppLocale messages', () => {
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_test_button_missing'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_test_missing_subscription_id'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_test_network_error'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('test_notification_invalid_response'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('test_notification_http_prefix'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_fetch_subscription_failed'"), true);
});


test('config page preserves backend test-notification messages and localizes only local fallbacks', () => {
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('admin_test_button_missing'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('admin_test_network_error'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('test_notification_invalid_response'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('test_notification_http_prefix'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_test_gotify_server_required'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_test_discord_user_id_required'"), true);
});

test('config page localizes config-save button and toast states without Chinese wrappers', () => {
  const normalizedConfigPageHtml = configPageHtml.replace(/\s+/g, ' ');
  assert.equal(normalizedConfigPageHtml.includes("window.AppLocale.getMessage('config_save_in_progress'"), true);
  assert.equal(normalizedConfigPageHtml.includes("window.AppLocale.getMessage('config_save_success'"), true);
  assert.equal(normalizedConfigPageHtml.includes("window.AppLocale.getMessage('config_save_failed_unknown'"), true);
  assert.equal(normalizedConfigPageHtml.includes("window.AppLocale.getMessage('config_save_failed_retry'"), true);
  assert.equal(normalizedConfigPageHtml.includes('showToast(result.message || window.AppLocale.getMessage('), true);
  assert.equal(normalizedConfigPageHtml.includes("showToast(result.message, 'error');"), false);
  assert.equal(normalizedConfigPageHtml.includes('保存中...'), false);
  assert.equal(normalizedConfigPageHtml.includes('配置保存成功'), false);
  assert.equal(normalizedConfigPageHtml.includes('配置保存失败: '), false);
  assert.equal(normalizedConfigPageHtml.includes('保存配置失败，请稍后再试'), false);
});

test('admin page sends locale headers for remaining subscription and config fetches', () => {
  assert.equal(adminPageHtml.includes("fetch('/api/subscriptions', {"), true);
  assert.equal(adminPageHtml.includes("fetch('/api/subscriptions/' + id, {"), true);
  assert.equal(adminPageHtml.includes("fetch(`/api/subscriptions/${subscriptionId}`, {"), true);
  assert.equal(adminPageHtml.includes("fetch(`/api/subscriptions/${subscriptionId}/payments`, {"), true);
  assert.equal(adminPageHtml.includes("fetch('/api/config', {"), true);
});

test('dashboard page localises browser-only load fallbacks via AppLocale messages', () => {
  assert.equal(dashboardPageHtml.includes("msg('dashboard_load_failed'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_load_failed_prefix'"), true);
});

test('dashboard page localises second-wave scheduler and stats copy', () => {
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_empty'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_last_run_label'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_status_label'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_current_hour_all'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_checked_matches_label'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_checked_matches'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_send_result'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_send_result_label'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_no_details'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_history_empty'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_history_unknown_time'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_history_sent'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_history_not_sent'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_sent_badge'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_scheduler_not_sent_badge'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_upcoming_empty'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_stats_monthly_spend'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_stats_monthly_subtitle'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_stats_yearly_spend'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_stats_active_subscriptions'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_stats_expiring_soon'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_recent_payments_empty'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_upcoming_days_left'"), true);
  assert.equal(dashboardPageHtml.includes("msg('dashboard_spending_empty'"), true);
  assert.equal(dashboardPageHtml.includes('const t = msg;'), false);
  assert.equal(dashboardPageHtml.includes('toLocaleString(getLocaleTag())'), true);
  assert.equal(dashboardPageHtml.includes('\u6700\u8fd1\u6267\u884c\u65f6\u95f4'), false);
  assert.equal(dashboardPageHtml.includes('\u6682\u65e0\u5386\u53f2\u8bb0\u5f55'), false);
  assert.equal(dashboardPageHtml.includes('\u672a\u77e5\u65f6\u95f4'), false);
  assert.equal(dashboardPageHtml.includes('\u5168\u90e8\u65f6\u6bb5'), false);
  assert.equal(dashboardPageHtml.includes('\u672c\u6b21\u6709\u53d1\u9001'), false);
  assert.equal(dashboardPageHtml.includes('\u672c\u6b21\u672a\u53d1\u9001'), false);
  assert.equal(dashboardPageHtml.includes('\u53d1\u9001\u7ed3\u679c'), false);
  assert.equal(dashboardPageHtml.includes('\u6708\u5ea6\u652f\u51fa (MYR)'), false);
  assert.equal(dashboardPageHtml.includes('\u8fc7\u53bb7\u5929\u5185\u6ca1\u6709\u652f\u4ed8\u8bb0\u5f55'), false);
  assert.equal(dashboardPageHtml.includes('\u672a\u67657\u5929\u5185\u6ca1\u6709\u5373\u5c06\u7eed\u8d39\u7684\u8ba2\u9605'), false);
  assert.equal(dashboardPageHtml.includes('\u6682\u65e0\u652f\u51fa\u6570\u636e'), false);
});

test('dashboard page removes remaining mojibake from static fallbacks and currency symbols', () => {
  assert.equal(containsMojibake(dashboardPageHtml), false);
  assert.equal(dashboardPageHtml.includes(String.fromCodePoint(0x1f4ed)), true);
  assert.equal(dashboardPageHtml.includes(String.fromCodePoint(0x1f4ca)), true);
  assert.equal(dashboardPageHtml.includes(String.fromCodePoint(0x1f4c2)), true);
});

test('admin page localises second-wave filters, table labels, and runtime actions', () => {
  assert.equal(adminPageHtml.includes('data-i18n-placeholder="admin_search_placeholder"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_filter_all_modes"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_filter_cycle"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_filter_reset"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_filter_all_categories"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_show_lunar"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_name"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_type"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_expiry"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_amount"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_reminder"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_status"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_actions"'), true);
  assert.equal(adminPageHtml.includes('data-i18n-title="admin_table_sort_expiry_asc"'), true);
  assert.equal(adminPageHtml.includes("msg('admin_validation_name_required'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_validation_period_value_positive'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_validation_start_date_format'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_validation_expiry_date_format'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_validation_reminder_non_negative'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_no_matching_subscriptions'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_status_paused'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_status_expired'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_status_normal'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_status_expiring_soon'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_load_failed_table'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_load_failed_toast'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_calendar_type_lunar'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_calendar_type_solar'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_fallback_type_other'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_period_prefix'"), true);
  assert.equal(adminPageHtml.includes("admin_period_unit_day"), true);
  assert.equal(adminPageHtml.includes("admin_period_unit_month"), true);
  assert.equal(adminPageHtml.includes("admin_period_unit_year"), true);
  assert.equal(adminPageHtml.includes("msg('admin_lunar_prefix'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_start_date_prefix'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_days_left_expired_days'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_days_left_expired_hours'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_days_left_days'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_days_left_hours'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_reminder_expiry_only'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_reminder_hour_level'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_amount_unset'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_action_edit'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_action_test'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_action_delete'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_action_activate'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_action_deactivate'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_delete_confirm'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_payment_history_title'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_renew_modal_title'"), true);

  assert.equal(adminPageHtml.includes('<option value="cycle">\u5faa\u73af\u8ba2\u9605</option>'), false);
  assert.equal(adminPageHtml.includes('<option value="reset">\u5230\u671f\u91cd\u7f6e</option>'), false);
  assert.equal(adminPageHtml.includes('<option value="">\u5168\u90e8\u5206\u7c7b</option>'), false);
  assert.equal(adminPageHtml.includes('<span class="text-gray-700">\u663e\u793a\u519c\u5386</span>'), false);
  assert.equal(adminPageHtml.includes('<i class="fas fa-sort-up ml-1 text-indigo-500" title="\u6309\u5230\u671f\u65f6\u95f4\u5347\u5e8f\u6392\u5e8f"></i>'), false);
  assert.equal(adminPageHtml.includes("createHoverText('\u5468\u671f: ' + periodText"), false);
  assert.equal(adminPageHtml.includes("createHoverText('\u519c\u5386: ' + lunarExpiryText"), false);
  assert.equal(adminPageHtml.includes("? '\u5f00\u59cb: ' + displayDtf.format"), false);
  assert.equal(adminPageHtml.includes("'<div class=\"text-xs text-purple-600 mt-1\">\u65e5\u5386\u7c7b\u578b\uff1a\u519c\u5386</div>'"), false);
  assert.equal(adminPageHtml.includes("'<div class=\"text-xs text-gray-600 mt-1\">\u65e5\u5386\u7c7b\u578b\uff1a\u516c\u5386</div>'"), false);
  assert.equal(adminPageHtml.includes("'<div class=\"text-xs text-gray-500 mt-1\">\u4ec5\u5230\u671f\u65f6\u63d0\u9192</div>'"), false);
  assert.equal(adminPageHtml.includes("'<div class=\"text-xs text-gray-500 mt-1\">\u5c0f\u65f6\u7ea7\u63d0\u9192</div>'"), false);
  assert.equal(adminPageHtml.includes("'<span class=\"text-xs text-gray-400\">\u672a\u8bbe\u7f6e</span>'"), false);
  assert.equal(adminPageHtml.includes('fa-paper-plane mr-1"></i>\u6d4b\u8bd5</button>'), false);
  assert.equal(adminPageHtml.includes('fa-trash-alt mr-1"></i>\u5220\u9664</button>'), false);
  assert.equal(adminPageHtml.includes('fa-pause-circle mr-1"></i>\u505c\u7528</button>'), false);
  assert.equal(adminPageHtml.includes('fa-play-circle mr-1"></i>\u542f\u7528</button>'), false);
  assert.equal(adminPageHtml.includes('\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5'), false);
  assert.equal(adminPageHtml.includes('\u52a0\u8f7d\u8ba2\u9605\u5217\u8868\u5931\u8d25'), false);
  assert.equal(adminPageHtml.includes('\u52a0\u8f7d\u4e2d...'), false);
});

test('admin page localises remaining modal, payment-history, and edit-payment strings', () => {
  assert.equal(adminPageHtml.includes('data-i18n="admin_modal_add_title"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_name"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_custom_type"'), true);
  assert.equal(adminPageHtml.includes('data-i18n-placeholder="admin_placeholder_custom_type"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_category"'), true);
  assert.equal(adminPageHtml.includes('data-i18n-placeholder="admin_placeholder_category"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_category_help"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_cost_settings"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_optional"'), true);
  assert.equal(adminPageHtml.includes('data-i18n-placeholder="admin_placeholder_amount"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_cost_help"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_subscription_mode"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_show_lunar_dates"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_lunar_cycle"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_start_date"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_period_value"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_period_unit"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_period_unit_day"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_period_unit_month"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_period_unit_year"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_expiry_date"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_auto_calculate_expiry"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_reminder_offset"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_reminder_unit_day"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_reminder_unit_hour"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_reminder_help"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_option_settings"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_enable_subscription"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_enable_auto_renew"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_label_notes"'), true);
  assert.equal(adminPageHtml.includes('data-i18n-placeholder="admin_placeholder_notes"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_cancel"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_save"'), true);

  assert.equal(adminPageHtml.includes("msg('admin_renew_current_none'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_lunar_cycle'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_payment_date'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_amount'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_period_count'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_period_help'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_current_expiry'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_new_expiry'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_preview_calculating'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_note_optional'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_placeholder_renew_note'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_confirm'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_preview_error'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_default_note'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_in_progress'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_success'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_failed'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_renew_error'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_history_failed'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_history_error'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_history_empty'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_type_initial'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_type_manual'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_type_auto'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_unknown'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_billing_period'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_total_spend'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_count'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_close'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_delete_payment_confirm'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_deleted'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_delete_failed'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_delete_error'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_not_found'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_fetch_error'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_subscription_name'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_date'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_note'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_save_in_progress'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_payment_updated'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_update_failed'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_update_error'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_date_invalid_format'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_date_invalid_value'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_reminder_hint_hour'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_reminder_hint_day'"), true);
  assert.equal(adminPageHtml.includes("msg('admin_modal_edit_title'"), true);

});

test('admin page source keeps strings readable instead of unicode escape soup', () => {
  assert.equal(/\\u[0-9a-fA-F]{4}/.test(adminPageHtml), false);
});

test('localized source files avoid question-mark placeholders, mojibake, and unicode escape literals', () => {
  for (const [name, source] of LOCALISED_SOURCE_FILES.entries()) {
    assert.equal(/\?{3,}/.test(source), false, `${name} should not contain placeholder question marks`);
    assert.equal(/\\u[0-9a-fA-F]{4}/.test(source), false, `${name} should not contain unicode escape literals`);
    assert.equal(containsMojibake(source), false, `${name} should not contain mojibake`);
  }
});

test('admin page removes remaining mojibake from dropdown options and date picker labels', () => {
  assert.equal(containsMojibake(adminPageHtml), false);
  assert.equal(adminPageHtml.includes('music_platform'), true);
  assert.equal(adminPageHtml.includes('streaming_media'), true);
  assert.equal(adminPageHtml.includes('updateMonthOptionLabels'), true);
});

test('admin page localises preset subscription type/category options via stable keys', () => {
  assert.equal(adminPageHtml.includes('const TYPE_OPTIONS = ['), false);
  assert.equal(adminPageHtml.includes('const CATEGORY_OPTIONS = ['), false);
  assert.equal(adminPageHtml.includes('const TYPE_OPTION_KEYS = ['), true);
  assert.equal(adminPageHtml.includes('const CATEGORY_OPTION_KEYS = ['), true);
  assert.equal(adminPageHtml.includes("msg(`subscription_type_${key}`)"), true);
  assert.equal(adminPageHtml.includes("msg(`subscription_category_${key}`)"), true);
  assert.equal(adminPageHtml.includes("localizeCustomTypeValue("), true);
  assert.equal(adminPageHtml.includes("localizeCategoryValue("), true);
  assert.equal(adminPageHtml.includes("normalizeCustomTypeValue("), true);
  assert.equal(adminPageHtml.includes("normalizeCategoryValue("), true);
});


test('admin page binds the list Show Lunar checkbox to rerender the table', () => {
  assert.equal(adminPageHtml.includes("const listShowLunar = document.getElementById('listShowLunar');"), true);
  assert.equal(adminPageHtml.includes("listShowLunar.addEventListener('change', handleListLunarToggle);"), true);
});

test('admin page keeps lunar rendering copy unchanged while localising picker chrome', () => {
  assert.equal(adminPageHtml.includes("updateLunarDisplay('startDate', 'startDateLunar')"), true);
  assert.equal(adminPageHtml.includes("updateLunarDisplay('expiryDate', 'expiryDateLunar')"), true);
  assert.equal(adminPageHtml.includes('lunar.fullStr'), true);
  assert.equal(adminPageHtml.includes('lunar.monthStr.replace('), true);
  assert.equal(adminPageHtml.includes('lunar.dayStr'), true);
  assert.equal(adminPageHtml.includes('<div class="lunar-text">'), true);
});

test('admin page localises non-lunar date picker chrome', () => {
  assert.equal(adminPageHtml.includes('data-i18n="admin_date_picker_select_month"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_date_picker_select_year"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_weekday_sun"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_weekday_mon"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_weekday_tue"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_weekday_wed"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_weekday_thu"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_weekday_fri"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_weekday_sat"'), true);
  assert.equal(adminPageHtml.includes("msg(`admin_month_${month + 1}`)"), true);
  assert.equal(adminPageHtml.includes('updateMonthOptionLabels();'), true);
  assert.equal(/this\.monthElement\.textContent\s*=\s*\(month \+ 1\)\s*\+/.test(adminPageHtml), false);
});

test('config page localises second-wave notifier and secret-management copy', () => {
  assert.equal(configPageHtml.includes('data-i18n-placeholder="config_admin_password_placeholder"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_admin_password_help"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_theme_help"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notifiers_heading"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notifier_webhook"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notifier_wechatbot"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notifier_email"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notifier_serverchan"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notifier_discord"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_link_wechatbot_docs"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_section_webhook_title"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_label_webhook_url"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_test_webhook"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_section_wechatbot_title"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_test_wechatbot"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_section_email_title"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_test_email"'), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_secret_configured'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_secret_pending_update'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_test_in_progress'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_generate_token_success'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_timezone_unknown_warning'"), true);
  assert.equal(configPageHtml.includes('留空表示不修改当前密码'), false);
  assert.equal(configPageHtml.includes('Webhook 通知'), false);
  assert.equal(configPageHtml.includes('企业微信机器人'), false);
  assert.equal(configPageHtml.includes('邮件通知'), false);
  assert.equal(configPageHtml.includes('Webhook Notification 配置'), false);
  assert.equal(configPageHtml.includes('测试 Webhook Notification'), false);
  assert.equal(configPageHtml.includes('WeCom Bot 文档'), false);
  assert.equal(configPageHtml.includes('WeCom Bot 配置'), false);
  assert.equal(configPageHtml.includes('测试 WeCom Bot'), false);
  assert.equal(configPageHtml.includes('Email Notification 配置'), false);
  assert.equal(configPageHtml.includes('测试 Email Notification'), false);
  assert.equal(configPageHtml.includes('已配置（已隐藏）'), false);
  assert.equal(configPageHtml.includes('未配置'), false);
  assert.equal(configPageHtml.includes('测试中...'), false);
  assert.equal(configPageHtml.includes('生成令牌'), false);
});


test('config page exposes notification locale setting', () => {
  assert.equal(configPageHtml.includes('id="notificationLocale"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_label_notification_locale"'), true);
  assert.equal(configPageHtml.includes('data-i18n="config_notification_locale_help"'), true);
  assert.equal(configPageHtml.includes("document.getElementById('notificationLocale').value = config.NOTIFICATION_LOCALE || 'en';"), true);
  assert.equal(configPageHtml.includes("NOTIFICATION_LOCALE: document.getElementById('notificationLocale').value.trim(),"), true);
  assert.equal(configPageHtml.includes('<option value="zh">'), true);
  assert.equal(configPageHtml.includes('<option value="en">'), true);
});
