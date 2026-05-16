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
  assert.equal(documentStub.title, 'Dashboard - SubsTracker');
  assert.equal(documentStub.documentElement.lang, 'en');
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


test('admin page localises remaining browser-only error toasts via AppLocale messages', () => {
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_test_button_missing'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_test_missing_subscription_id'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_test_network_error'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('test_notification_invalid_response'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('test_notification_http_prefix'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_fetch_subscription_failed'"), true);
  assert.equal(adminPageHtml.includes('????????: '), false);
});


test('config page preserves backend test-notification messages and localizes only local fallbacks', () => {
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('admin_test_button_missing'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('admin_test_network_error'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('test_notification_invalid_response'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('test_notification_http_prefix'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_test_gotify_server_required'"), true);
  assert.equal(configPageHtml.includes("window.AppLocale.getMessage('config_test_discord_user_id_required'"), true);
  assert.equal(configPageHtml.includes(' ???????'), false);
  assert.equal(configPageHtml.includes(' ??????: '), false);
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
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_load_failed'"), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_load_failed_prefix'"), true);
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
