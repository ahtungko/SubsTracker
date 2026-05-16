# Admin/Dashboard/Config UI Localisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-wave browser-locale zh/en UI localisation for admin, dashboard, and config pages using shared message dictionaries plus `data-i18n`, while keeping unsupported locales on English fallback.

**Architecture:** Extend `src/core/locale.js` from timezone labels into a general locale catalog, expose `getMessage()` and `applyTranslations()` from the injected `window.AppLocale` runtime, then localise a narrow first-wave set of static labels in `adminPage.html`, `dashboardPage.html`, and `configPage.html` using declarative `data-i18n` markers. Keep login, toast/confirm copy, and server-generated notifications out of scope.

**Tech Stack:** Cloudflare Workers ESM, inline HTML templates, injected shared browser scripts, Node test runner (`node --experimental-default-type=module --test`)

**User preference:** Do **not** commit during execution. Leave changes uncommitted for user review.

---

## File Structure

### Create
- `tests/views/browser-ui-localisation.test.js` — regression tests for `getMessage()`, `applyTranslations()`, and first-wave `data-i18n` usage on admin/dashboard/config

### Modify
- `src/core/locale.js` — add shared `UI_MESSAGES` and `getMessage()`
- `src/views/browser-locale-resources.js` — expose `getMessage()` and `applyTranslations()` in `window.AppLocale`
- `src/views/dashboardPage.html` — add first-wave `data-i18n` markers and call `window.AppLocale.applyTranslations()`
- `src/views/adminPage.html` — add first-wave `data-i18n` markers and call `window.AppLocale.applyTranslations()`
- `src/views/configPage.html` — add first-wave `data-i18n` markers and call `window.AppLocale.applyTranslations()`
- `tests/core/locale.test.js` — extend locale unit coverage for general UI messages
- `tests/views/browser-locale-timezone.test.js` — keep timezone runtime coverage intact if a small API-shape assertion update is needed, otherwise leave unchanged

### Leave unchanged in this phase
- `src/views/loginPage.html`
- toast / confirm / alert copy
- backend-generated notification copy
- email / Discord / reminder localisation behavior
- persisted user language settings

---

## First-Wave Translation Keys

These exact keys should be added to `UI_MESSAGES` and used in markup for this phase.

### Shared navigation/app keys
- `app_name`
- `nav_dashboard`
- `nav_subscriptions`
- `nav_settings`
- `nav_logout`

### Dashboard keys
- `dashboard_page_heading`
- `dashboard_page_subtitle`
- `dashboard_section_scheduler_status`
- `dashboard_badge_cron_observability`
- `dashboard_section_recent_payments`
- `dashboard_badge_last_7_days`
- `dashboard_section_upcoming_renewals`
- `dashboard_badge_next_7_days`
- `dashboard_section_scheduler_history`
- `dashboard_section_expense_by_type`
- `dashboard_badge_yearly_summary_myr`
- `dashboard_section_expense_by_category`

### Admin keys
- `admin_page_heading`
- `admin_page_subtitle`
- `admin_add_subscription`

### Config keys
- `config_page_heading`
- `config_section_admin_account`
- `config_label_admin_username`
- `config_label_admin_password`
- `config_section_display_settings`
- `config_label_theme_mode`
- `config_theme_light`
- `config_theme_dark`
- `config_theme_system`
- `config_show_lunar`
- `config_show_lunar_help`
- `config_section_timezone_settings`
- `config_label_timezone`
- `config_timezone_help`
- `config_section_notification_settings`
- `config_label_notification_hours`
- `config_notification_hours_help`
- `config_notification_hint_title`
- `config_notification_hint_body_1`
- `config_notification_hint_body_2`
- `config_save`

These keys are intentionally narrow. Do not expand into notifier-specific form fields or modal/button text in this phase.

---

### Task 1: Extend the shared locale catalog with UI messages

**Files:**
- Modify: `tests/core/locale.test.js`
- Modify: `src/core/locale.js`

- [ ] **Step 1: Add failing unit tests for general UI messages**

Append these tests to `tests/core/locale.test.js`:

```js
test('getMessage returns Chinese UI copy for zh locales', () => {
  assert.equal(getMessage('nav_dashboard', 'zh-CN'), '仪表盘');
  assert.equal(getMessage('config_save', 'zh-MY'), '保存设置');
});

test('getMessage returns English UI copy for en locales', () => {
  assert.equal(getMessage('nav_dashboard', 'en-US'), 'Dashboard');
  assert.equal(getMessage('config_save', 'en-GB'), 'Save Settings');
});

test('getMessage falls back to English for unsupported locales', () => {
  assert.equal(getMessage('nav_dashboard', 'ms-MY'), 'Dashboard');
  assert.equal(getMessage('config_section_display_settings', 'ja-JP'), 'Display Settings');
});

test('getMessage falls back to the key when no translation exists', () => {
  assert.equal(getMessage('missing_message_key', 'zh-CN'), 'missing_message_key');
});
```

Also update the import list at the top of `tests/core/locale.test.js` to include `UI_MESSAGES` and `getMessage`:

```js
import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  UI_MESSAGES,
  normalizeUiLocale,
  getTimezoneDisplayName,
  getMessage
} from '../../src/core/locale.js';
```

And extend the existing catalog-export test with these assertions:

```js
  assert.equal(UI_MESSAGES.zh.nav_dashboard, '仪表盘');
  assert.equal(UI_MESSAGES.en.nav_dashboard, 'Dashboard');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: FAIL because `UI_MESSAGES` and `getMessage` are not exported yet.

- [ ] **Step 3: Add the shared UI message catalog and helper**

In `src/core/locale.js`, add this `UI_MESSAGES` constant immediately after `TIMEZONE_LABELS`:

```js
const UI_MESSAGES = {
  zh: {
    app_name: '订阅管理系统',
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
    config_save: '保存设置'
  },
  en: {
    app_name: 'Subscription Manager',
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
    config_save: 'Save Settings'
  }
};
```

Then add this helper after `getTimezoneDisplayName(...)`:

```js
function getMessage(key, locale = DEFAULT_UI_LOCALE) {
  const resolvedLocale = normalizeUiLocale(locale);
  const localizedMessages = UI_MESSAGES[resolvedLocale] || UI_MESSAGES[DEFAULT_UI_LOCALE] || {};
  const fallbackMessages = UI_MESSAGES[DEFAULT_UI_LOCALE] || {};

  return localizedMessages[key] || fallbackMessages[key] || key;
}
```

And update the export list to include `UI_MESSAGES` and `getMessage`:

```js
export {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  UI_MESSAGES,
  normalizeUiLocale,
  getTimezoneDisplayName,
  getMessage
};
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: PASS with the original locale tests plus the new `getMessage()` coverage all green.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 2: Expand the browser runtime with `getMessage()` and `applyTranslations()`

**Files:**
- Create: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/browser-locale-resources.js`

- [ ] **Step 1: Write the failing browser-localisation regression test**

Create `tests/views/browser-ui-localisation.test.js` with this exact content:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const runtimeJsPath = path.join(repoRoot, 'src/views/browser-locale-resources.js');

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
      textContent: '仪表盘',
      getAttribute(name) {
        return name === 'data-i18n' ? this.dataset.i18n : null;
      }
    },
    {
      dataset: { i18n: 'config_save' },
      textContent: '保存设置',
      getAttribute(name) {
        return name === 'data-i18n' ? this.dataset.i18n : null;
      }
    }
  ];

  const documentStub = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-i18n]');
      return translatedNodes;
    }
  };

  const sandbox = {
    window: {},
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
  assert.equal(AppLocale.getMessage('nav_dashboard', 'zh-CN'), '仪表盘');
  assert.equal(AppLocale.getMessage('nav_dashboard', 'en-US'), 'Dashboard');
  assert.equal(AppLocale.getMessage('missing_key', 'zh-CN'), 'missing_key');

  AppLocale.applyTranslations(documentStub, 'en-US');

  assert.equal(translatedNodes[0].textContent, 'Dashboard');
  assert.equal(translatedNodes[1].textContent, 'Save Settings');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `window.AppLocale` does not expose `getMessage` or `applyTranslations` yet.

- [ ] **Step 3: Implement browser-side UI message lookup and translation application**

In `src/views/browser-locale-resources.js`, update the import list to include `UI_MESSAGES` and `getMessage`:

```js
import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  UI_MESSAGES,
  normalizeUiLocale,
  getTimezoneDisplayName,
  getMessage
} from '../core/locale.js';
```

Inside `buildBrowserLocaleResources()`, add these serialized bindings after `TIMEZONE_LABELS`:

```js
    const UI_MESSAGES = ${JSON.stringify(UI_MESSAGES)};
    const getMessage = ${getMessage.toString()};
```

Then add this helper before `window.AppLocale = Object.freeze(...)`:

```js
    function applyTranslations(root = document, locale) {
      const resolvedLocale = normalizeUiLocale(locale || getPreferredLocale());
      const nodes = root.querySelectorAll('[data-i18n]');

      nodes.forEach((node) => {
        const key = node.getAttribute('data-i18n') || node.dataset?.i18n;
        if (!key) return;
        node.textContent = getMessage(key, resolvedLocale);
      });
    }
```

Finally extend the frozen runtime surface to include `getMessage` and `applyTranslations`:

```js
    window.AppLocale = Object.freeze({
      DEFAULT_UI_LOCALE,
      SUPPORTED_TIMEZONE_IDS,
      normalizeUiLocale,
      getPreferredLocale,
      getTimezoneDisplayName,
      formatTimezoneDisplay,
      getMessage,
      applyTranslations
    });
```

- [ ] **Step 4: Run browser-localisation tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js
```

Expected: PASS. The runtime should still satisfy timezone tests while also exposing the new general localisation helpers.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 3: Localise first-wave dashboard static UI

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/dashboardPage.html`

- [ ] **Step 1: Extend the dashboard regression test first**

Append this test to `tests/views/browser-ui-localisation.test.js`:

```js
const dashboardPageHtml = require('node:fs').readFileSync(path.join(repoRoot, 'src/views/dashboardPage.html'), 'utf8');

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
  assert.equal(dashboardPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});
```

Immediately after the existing imports at the top of `tests/views/browser-ui-localisation.test.js`, add:

```js
import fs from 'node:fs';
```

And change the dashboard file read in the appended test to:

```js
const dashboardPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/dashboardPage.html'), 'utf8');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `dashboardPage.html` does not contain the required `data-i18n` markers or translation call yet.

- [ ] **Step 3: Add first-wave dashboard markers and translation call**

In `src/views/dashboardPage.html`, change the app name span in the desktop nav from:

```html
<span class="font-bold text-xl text-gray-800">订阅管理系统</span>
```

to:

```html
<span class="font-bold text-xl text-gray-800" data-i18n="app_name">订阅管理系统</span>
```

In both desktop and mobile nav links, wrap the visible text in spans with these keys:

```html
<span data-i18n="nav_dashboard">仪表盘</span>
<span data-i18n="nav_subscriptions">订阅列表</span>
<span data-i18n="nav_settings">系统配置</span>
<span data-i18n="nav_logout">退出登录</span>
```

Update the page heading block to:

```html
<h2 class="text-2xl font-bold text-gray-800" data-i18n="dashboard_page_heading">📊 仪表板</h2>
<p class="text-sm text-gray-500 mt-1" data-i18n="dashboard_page_subtitle">订阅费用和活动概览（统计金额已折合为 MYR）</p>
```

Update these section headings and badges with `data-i18n` markers:

```html
<h3 class="text-lg font-medium text-gray-900" data-i18n="dashboard_section_scheduler_status">自动提醒任务状态</h3>
<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full" data-i18n="dashboard_badge_cron_observability">Cron 可观测性</span>
<h3 class="text-lg font-medium text-gray-900" data-i18n="dashboard_section_recent_payments">最近支付</h3>
<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full" data-i18n="dashboard_badge_last_7_days">过去7天</span>
<h3 class="text-lg font-medium text-gray-900" data-i18n="dashboard_section_upcoming_renewals">即将续费</h3>
<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full" data-i18n="dashboard_badge_next_7_days">未来7天</span>
<h3 class="text-lg font-medium text-gray-900" data-i18n="dashboard_section_scheduler_history">自动提醒任务历史（最近10次）</h3>
<h3 class="text-lg font-medium text-gray-900" data-i18n="dashboard_section_expense_by_type">按类型支出排行</h3>
<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full" data-i18n="dashboard_badge_yearly_summary_myr">年度统计 (折合MYR)</span>
<h3 class="text-lg font-medium text-gray-900" data-i18n="dashboard_section_expense_by_category">按分类支出统计</h3>
```

At the very top of the bottom `<script>` block, insert:

```js
    window.AppLocale.applyTranslations();
```

Place it before dashboard-specific rendering logic begins.

- [ ] **Step 4: Run the dashboard localisation tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js
```

Expected: PASS. Dashboard should satisfy both general i18n coverage and existing timezone-script compile coverage.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 4: Localise first-wave admin static UI

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/adminPage.html`

- [ ] **Step 1: Extend the admin regression test first**

Append this test to `tests/views/browser-ui-localisation.test.js`:

```js
const adminPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/adminPage.html'), 'utf8');

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `adminPage.html` does not contain the required markers yet.

- [ ] **Step 3: Add first-wave admin markers and translation call**

In `src/views/adminPage.html`, add the same shared nav/app markers used on dashboard:

```html
<span class="font-bold text-xl text-gray-800" data-i18n="app_name">订阅管理系统</span>
<span data-i18n="nav_dashboard">仪表盘</span>
<span data-i18n="nav_subscriptions">订阅列表</span>
<span data-i18n="nav_settings">系统配置</span>
<span data-i18n="nav_logout">退出登录</span>
```

Update the page intro block to:

```html
<h2 class="text-2xl font-bold text-gray-800" data-i18n="admin_page_heading">订阅列表</h2>
<p class="text-sm text-gray-500 mt-1" data-i18n="admin_page_subtitle">使用搜索与分类快速定位订阅，开启农历显示可同时查看农历日期</p>
```

Update the add button to wrap its text in a translated span:

```html
<button id="addSubscriptionBtn" class="btn-primary text-white px-4 py-2 rounded-md text-sm font-medium flex items-center shrink-0">
  <i class="fas fa-plus mr-2"></i><span data-i18n="admin_add_subscription">添加新订阅</span>
</button>
```

At the very top of the bottom `<script>` block, insert:

```js
    window.AppLocale.applyTranslations();
```

Place it before admin-specific rendering and event wiring begins.

- [ ] **Step 4: Run the admin localisation tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js tests/views/currency-myr.test.js
```

Expected: PASS. Admin should satisfy new i18n assertions while preserving existing inline-script compile coverage.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 5: Localise first-wave config static UI and run full regression

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/configPage.html`
- Test: `tests/core/locale.test.js`
- Test: `tests/views/browser-locale-timezone.test.js`
- Test: `tests/views/currency-myr.test.js`

- [ ] **Step 1: Extend the config regression test first**

Append this test to `tests/views/browser-ui-localisation.test.js`:

```js
const configPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/configPage.html'), 'utf8');

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `configPage.html` does not contain the required markers yet.

- [ ] **Step 3: Add first-wave config markers and translation call**

In `src/views/configPage.html`, add the same shared nav/app markers used on dashboard/admin:

```html
<span class="font-bold text-xl text-gray-800" data-i18n="app_name">订阅管理系统</span>
<span data-i18n="nav_dashboard">仪表盘</span>
<span data-i18n="nav_subscriptions">订阅列表</span>
<span data-i18n="nav_settings">系统配置</span>
<span data-i18n="nav_logout">退出登录</span>
```

Update these headings and labels with `data-i18n`:

```html
<h2 class="text-2xl font-bold text-gray-800 mb-6" data-i18n="config_page_heading">系统配置</h2>
<h3 class="text-lg font-medium text-gray-900 mb-4" data-i18n="config_section_admin_account">管理员账户</h3>
<label for="adminUsername" class="block text-sm font-medium text-gray-700" data-i18n="config_label_admin_username">用户名</label>
<label for="adminPassword" class="block text-sm font-medium text-gray-700" data-i18n="config_label_admin_password">密码</label>
<h3 class="text-lg font-medium text-gray-900 mb-4" data-i18n="config_section_display_settings">显示设置</h3>
<label for="themeModeSelect" class="block text-sm font-medium text-gray-700 mb-1" data-i18n="config_label_theme_mode">主题模式</label>
<option value="light" data-i18n="config_theme_light">🌞 浅色模式</option>
<option value="dark" data-i18n="config_theme_dark">🌙 暗黑模式</option>
<option value="system" data-i18n="config_theme_system">🖥️ 跟随系统</option>
<span class="ml-2 text-sm text-gray-700" data-i18n="config_show_lunar">在通知中显示农历日期</span>
<p class="mt-1 text-sm text-gray-500" data-i18n="config_show_lunar_help">控制是否在通知消息中包含农历日期信息</p>
<h3 class="text-lg font-medium text-gray-900 mb-4" data-i18n="config_section_timezone_settings">时区设置</h3>
<label for="timezone" class="block text-sm font-medium text-gray-700 mb-1" data-i18n="config_label_timezone">时区选择</label>
<p class="mt-1 text-sm text-gray-500" data-i18n="config_timezone_help">该项仅用于兼容旧配置与展示参考；后端调度与提醒计算统一使用 UTC，页面时间始终按当前设备时区显示。</p>
<h3 class="text-lg font-medium text-gray-900 mb-4" data-i18n="config_section_notification_settings">通知设置</h3>
<label for="notificationHours" class="block text-sm font-medium text-gray-700" data-i18n="config_label_notification_hours">通知时段（UTC）</label>
<p class="mt-1 text-sm text-gray-500" data-i18n="config_notification_hours_help">可输入多个小时，使用逗号或空格分隔；留空则默认每天执行一次任务即可</p>
<p class="font-medium mb-1" data-i18n="config_notification_hint_title">提示</p>
<p data-i18n="config_notification_hint_body_1">后台统一按 UTC 判断通知时段。示例：北京时间 08:00 对应 UTC 00，请在此填 00。</p>
<p class="mt-1" data-i18n="config_notification_hint_body_2">若 Cron 已设置为每小时执行，可用该字段限制实际发送提醒的小时段。</p>
<span data-i18n="config_save">保存设置</span>
```

For the save button, keep the icon and wrap only the text:

```html
<button type="submit" class="btn-primary text-white px-6 py-2 rounded-md text-sm font-medium">
  <i class="fas fa-save mr-2"></i><span data-i18n="config_save">保存设置</span>
</button>
```

At the very top of the bottom `<script>` block, insert:

```js
    window.AppLocale.applyTranslations();
```

Place it before config-page initialization and event wiring begins.

- [ ] **Step 4: Run the targeted regression suite**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js tests/views/browser-locale-timezone.test.js tests/views/currency-myr.test.js
```

Expected: PASS. This verifies locale catalog behavior, UI runtime behavior, page-level translation markers, timezone runtime behavior, and existing admin script safety.

- [ ] **Step 5: Run the full project test suite**

Run:

```bash
npm test
```

Expected: PASS with zero failing tests.

- [ ] **Step 6: Final handoff without commit**

Do not commit. Summarize the touched files and leave the working tree dirty for the user to review and commit manually.

---

## Self-Review

### Spec coverage
- Shared locale catalog extension: covered by Task 1.
- `window.AppLocale.getMessage()` and `applyTranslations()`: covered by Task 2.
- `data-i18n` approach on admin/dashboard/config only: covered by Tasks 3-5.
- Login/toast/server-side notifications deferred: preserved by explicit file scope and out-of-scope list.
- zh/en plus English fallback: covered by unit tests and runtime tests.

### Placeholder scan
- No placeholder markers remain.
- Every code-changing step includes exact code snippets.
- Every verification step includes a concrete command and expected outcome.

### Type consistency
- Shared runtime names are consistently `getMessage()` and `applyTranslations()`.
- Shared message catalog is consistently named `UI_MESSAGES`.
- Page markers consistently use `data-i18n` keys defined in the first-wave key list.
