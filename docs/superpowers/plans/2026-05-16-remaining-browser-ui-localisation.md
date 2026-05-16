# Remaining Browser UI Localisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish zh/en localisation for all remaining browser-visible UI text on the admin, dashboard, config, and login pages, while preventing new `???` or literal `\uXXXX` source regressions.

**Architecture:** Keep the existing browser-side localisation stack centered on `src/core/locale.js` and `window.AppLocale`. Extend the shared message catalog with the remaining keys, then finish coverage page-by-page using `data-i18n*` for static markup and `window.AppLocale.getMessage(...)` for runtime-generated strings and template-built HTML.

**Tech Stack:** Cloudflare Workers HTML templates, inline browser JavaScript, shared `window.AppLocale` runtime, Node built-in test runner, npm

**User preference:** Do not create commits during execution. Leave all implementation changes uncommitted for manual review.

---

## File Structure

**Modify**
- `src/core/locale.js` � add the remaining browser-visible zh/en keys and keep source text readable
- `src/views/dashboardPage.html` � localise scheduler/status/history/stat runtime strings and locale-tag date formatting
- `src/views/configPage.html` � localise remaining static helper text, notifier labels, token controls, and browser-visible runtime messages
- `src/views/adminPage.html` � localise remaining filter options, table chrome, status/reminder strings, list-row actions, renew/payment modal text, and browser-visible runtime states
- `tests/core/locale.test.js` � add remaining locale-key coverage plus source-hygiene assertions
- `tests/views/browser-ui-localisation.test.js` � add page-level regression coverage for remaining dashboard/admin/config UI strings and source readability
- `tests/views/config-page-discord.test.js` � keep Discord config expectations aligned with the localized secret-status implementation

**Do not modify in this phase**
- backend logging text
- source-code comments
- non-browser notification delivery flows already covered by notification-locale work
- `wrangler.toml`

---

### Task 1: Complete the shared locale catalog and source-hygiene tests

**Files:**
- Modify: `tests/core/locale.test.js`
- Modify: `src/core/locale.js`

- [ ] **Step 1: Write the failing locale and source-hygiene tests**

Append these tests to `tests/core/locale.test.js`:

```js
test('getMessage returns localized dashboard scheduler and stats strings', () => {
  assert.equal(getMessage('dashboard_scheduler_last_run_label', 'zh-CN'), '??????');
  assert.equal(getMessage('dashboard_scheduler_status_label', 'en-US'), 'Status');
  assert.equal(getMessage('dashboard_scheduler_checked_matches', 'zh-CN', { checked: 5, matched: 2 }), '?? 5 ???? 2 ?');
  assert.equal(getMessage('dashboard_stats_total_subscriptions', 'en-US', { count: 12 }), 'Total subscriptions: 12');
});

test('getMessage returns localized config and admin completion strings', () => {
  assert.equal(getMessage('config_admin_password_help', 'zh-CN'), '???????????');
  assert.equal(getMessage('config_notifier_webhook', 'en-US'), 'Webhook Notification');
  assert.equal(getMessage('admin_status_expired', 'zh-CN'), '???');
  assert.equal(getMessage('admin_edit_payment_title', 'en-US'), 'Edit Payment Record');
});

test('locale source keeps shared zh strings readable instead of unicode escape soup', () => {
  assert.equal(localeSource.includes('\\u6700\\u8fd1\\u6267\\u884c\\u65f6\\u95f4'), false);
  assert.equal(localeSource.includes('\\u7559\\u7a7a\\u8868\\u793a\\u4e0d\\u4fee\\u6539\\u5f53\\u524d\\u5bc6\\u7801'), false);
  assert.equal(localeSource.includes('\\u5df2\\u8fc7\\u671f'), false);
});
```

Make sure `tests/core/locale.test.js` already reads `src/core/locale.js` into `localeSource`; if not, add:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localeSource = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'core', 'locale.js'), 'utf8');
```

- [ ] **Step 2: Run the locale tests to verify they fail**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: FAIL because the new dashboard/config/admin keys do not exist yet and the new source-hygiene assertions are not yet satisfied.

- [ ] **Step 3: Add the remaining shared locale keys in `src/core/locale.js`**

Add these keys to the `zh` block in `src/core/locale.js` near the existing dashboard/admin/config runtime entries:

```js
    dashboard_scheduler_last_run_label: '??????',
    dashboard_scheduler_status_label: '??',
    dashboard_scheduler_current_hour_label: '???? / ?????UTC?',
    dashboard_scheduler_checked_matches: '?? {checked} ???? {matched} ?',
    dashboard_scheduler_send_result: '?? {attempted} ?????? {success}??? {failed}????? {skipped}',
    dashboard_scheduler_no_details: '????',
    dashboard_scheduler_history_empty: '??????',
    dashboard_scheduler_history_unknown_time: '????',
    dashboard_scheduler_history_sent: '???',
    dashboard_scheduler_history_not_sent: '???',
    config_admin_password_help: '???????????',
    config_theme_help: '?????????',
    config_notifier_webhook: 'Webhook ??',
    config_notifier_wechatbot: '???????',
    config_notifier_email: '????',
    config_notifier_serverchan: 'Server?',
    admin_status_paused: '???',
    admin_status_expired: '???',
    admin_status_normal: '??',
    admin_edit_payment_title: '??????',
    admin_delete_payment_confirm: '???????????????????????',
    admin_payment_deleted: '???????',
    admin_delete_failed: '????',
    admin_delete_error: '???????',
    admin_payment_not_found: '???????',
    admin_payment_fetch_error: '???????????',
    admin_subscription_name: '????',
    admin_payment_date: '????',
    admin_payment_amount: '????',
    admin_note: '??',
    admin_close: '??',
    admin_cancel: '??',
```

Add these keys to the `en` block in the same file:

```js
    dashboard_scheduler_last_run_label: 'Last Run Time',
    dashboard_scheduler_status_label: 'Status',
    dashboard_scheduler_current_hour_label: 'Current Hour / Configured Window (UTC)',
    dashboard_scheduler_checked_matches: 'Checked {checked} subscriptions, matched {matched}',
    dashboard_scheduler_send_result: 'Attempted {attempted} channels, succeeded {success}, failed {failed}, dedupe skipped {skipped}',
    dashboard_scheduler_no_details: 'No details yet',
    dashboard_scheduler_history_empty: 'No history records yet',
    dashboard_scheduler_history_unknown_time: 'Unknown time',
    dashboard_scheduler_history_sent: 'Sent',
    dashboard_scheduler_history_not_sent: 'Not sent',
    config_admin_password_help: 'Leave blank to keep the current password',
    config_theme_help: 'Choose the visual appearance used by the app',
    config_notifier_webhook: 'Webhook Notification',
    config_notifier_wechatbot: 'WeCom Bot',
    config_notifier_email: 'Email Notification',
    config_notifier_serverchan: 'ServerChan',
    admin_status_paused: 'Paused',
    admin_status_expired: 'Expired',
    admin_status_normal: 'Normal',
    admin_edit_payment_title: 'Edit Payment Record',
    admin_delete_payment_confirm: 'Delete this payment record? Statistics will be recalculated after deletion.',
    admin_payment_deleted: 'Payment record deleted',
    admin_delete_failed: 'Delete failed',
    admin_delete_error: 'An error occurred while deleting',
    admin_payment_not_found: 'Payment record not found',
    admin_payment_fetch_error: 'An error occurred while fetching the payment record',
    admin_subscription_name: 'Subscription Name',
    admin_payment_date: 'Payment Date',
    admin_payment_amount: 'Payment Amount',
    admin_note: 'Note',
    admin_close: 'Close',
    admin_cancel: 'Cancel',
```

Keep the shared helper implementations readable. Do not rewrite zh strings as literal `\uXXXX` escape sequences.

- [ ] **Step 4: Run the locale tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: PASS, including the new source-hygiene assertion.

- [ ] **Step 5: Leave the working tree uncommitted**

Do not create a git commit. The repository preference for this localisation work is manual review before any commit.

---

### Task 2: Finish dashboard runtime localisation and scheduler/status coverage

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/dashboardPage.html`

- [ ] **Step 1: Add failing dashboard regression assertions**

Append these assertions to the existing `dashboard page localises second-wave scheduler and stats copy` test in `tests/views/browser-ui-localisation.test.js`:

```js
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_scheduler_last_run_label'"), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_scheduler_status_label'"), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_scheduler_checked_matches'"), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_scheduler_send_result'"), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_scheduler_history_empty'"), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_scheduler_history_sent'"), true);
  assert.equal(dashboardPageHtml.includes("window.AppLocale.getMessage('dashboard_scheduler_history_not_sent'"), true);
  assert.equal(dashboardPageHtml.includes("toLocaleString(getLocaleTag())"), true);
  assert.equal(dashboardPageHtml.includes('??????'), false);
  assert.equal(dashboardPageHtml.includes('??????'), false);
```

- [ ] **Step 2: Run the targeted dashboard tests to verify they fail**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `dashboardPage.html` still contains hardcoded scheduler/status/history Chinese text and still uses `toLocaleString('zh-CN')` in scheduler/history rendering.

- [ ] **Step 3: Replace the remaining dashboard scheduler and history strings**

In `src/views/dashboardPage.html`, define a page-local message helper immediately under the existing locale helpers:

```js
    const msg = (key, params = {}) => window.AppLocale.getMessage(key, window.AppLocale.getPreferredLocale(), params);
```

Then replace the scheduler/history block with this exact pattern:

```js
            const runAt = status.lastRunAt ? new Date(status.lastRunAt).toLocaleString(getLocaleTag()) : msg('dashboard_scheduler_history_unknown_time');
            const configuredHours = Array.isArray(status.configuredHours) && status.configuredHours.length > 0
              ? status.configuredHours.join(', ')
              : msg('dashboard_scheduler_current_hour_all');
            const sentBadge = status.sent
              ? '<span class="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">' + msg('dashboard_scheduler_sent_badge') + '</span>'
              : '<span class="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">' + msg('dashboard_scheduler_not_sent_badge') + '</span>';
```

```js
                  <div class="text-gray-500">${msg('dashboard_scheduler_last_run_label')}</div>
```

```js
                  <div class="text-gray-500">${msg('dashboard_scheduler_status_label')}</div>
```

```js
                  <div class="text-gray-500">${msg('dashboard_scheduler_current_hour_label')}</div>
```

```js
                  <div class="text-gray-900 font-medium mt-1">${msg('dashboard_scheduler_checked_matches', { checked: status.checkedSubscriptions || 0, matched: status.expiringMatched || 0 })}</div>
```

```js
                  <div class="text-gray-500">${msg('dashboard_scheduler_send_result_label')}</div>
                  <div class="text-gray-900 font-medium mt-1">${msg('dashboard_scheduler_send_result', {
                    attempted: sendResult.attempted || 0,
                    success: sendResult.successCount || 0,
                    failed: sendResult.failedCount || 0,
                    skipped: status.dedupeSkipped || 0
                  })}</div>
                  <div class="text-xs text-gray-500 mt-1">${status.reason || msg('dashboard_scheduler_no_details')}</div>
```

```js
            schedulerHistoryEl.innerHTML = '<div class="text-sm text-gray-500">' + msg('dashboard_scheduler_history_empty') + '</div>';
```

```js
              const when = item.lastRunAt ? new Date(item.lastRunAt).toLocaleString(getLocaleTag()) : msg('dashboard_scheduler_history_unknown_time');
              const sent = item.sent ? msg('dashboard_scheduler_history_sent') : msg('dashboard_scheduler_history_not_sent');
```

Also add these locale keys from this task to `src/core/locale.js` if they are not already present:

```js
    dashboard_scheduler_current_hour_all: '????',
    dashboard_scheduler_sent_badge: '?????',
    dashboard_scheduler_not_sent_badge: '?????',
    dashboard_scheduler_send_result_label: '????',
```

```js
    dashboard_scheduler_current_hour_all: 'All hours',
    dashboard_scheduler_sent_badge: 'Sent this run',
    dashboard_scheduler_not_sent_badge: 'No send this run',
    dashboard_scheduler_send_result_label: 'Send Result',
```

- [ ] **Step 4: Re-run the dashboard regression tests**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js
```

Expected: PASS, including the new dashboard assertions.

- [ ] **Step 5: Leave the working tree uncommitted**

Do not create a git commit.

---

### Task 3: Finish config markup/help text and browser-visible notifier strings

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `tests/views/config-page-discord.test.js`
- Modify: `src/views/configPage.html`
- Modify: `src/core/locale.js`

- [ ] **Step 1: Add failing config regression coverage first**

In `tests/views/browser-ui-localisation.test.js`, extend the existing `config page localises second-wave notifier and secret-management copy` test with these assertions:

```js
  assert.equal(configPageHtml.includes("data-i18n=\"config_admin_password_help\""), true);
  assert.equal(configPageHtml.includes("data-i18n=\"config_theme_help\""), true);
  assert.equal(configPageHtml.includes("data-i18n=\"config_notifier_webhook\""), true);
  assert.equal(configPageHtml.includes("data-i18n=\"config_notifier_wechatbot\""), true);
  assert.equal(configPageHtml.includes("data-i18n=\"config_notifier_email\""), true);
  assert.equal(configPageHtml.includes("data-i18n=\"config_notifier_serverchan\""), true);
  assert.equal(configPageHtml.includes('???????????'), false);
  assert.equal(configPageHtml.includes('Webhook ??'), false);
  assert.equal(configPageHtml.includes('???????'), false);
  assert.equal(configPageHtml.includes('????'), false);
```

In `tests/views/config-page-discord.test.js`, keep the secret-status assertion in the localized form:

```js
assert.match(html, /setSecretStatus\('DISCORD_BOT_TOKEN', cfg\.DISCORD_BOT_TOKEN \? window\.AppLocale\.getMessage\('config_secret_configured', window\.AppLocale\.getPreferredLocale\(\)\) : window\.AppLocale\.getMessage\('config_secret_not_configured', window\.AppLocale\.getPreferredLocale\(\)\)\)/);
```

- [ ] **Step 2: Run the config-focused tests to verify they fail**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js tests/views/config-page-discord.test.js
```

Expected: FAIL because `configPage.html` still contains untranslated static helper text and notifier labels.

- [ ] **Step 3: Add the remaining config locale keys and markup markers**

Add these keys to `src/core/locale.js`:

```js
    config_admin_password_help: '???????????',
    config_theme_help: '?????????',
    config_notifier_webhook: 'Webhook ??',
    config_notifier_wechatbot: '???????',
    config_notifier_email: '????',
    config_notifier_serverchan: 'Server?',
```

```js
    config_admin_password_help: 'Leave blank to keep the current password',
    config_theme_help: 'Choose the visual appearance used by the app',
    config_notifier_webhook: 'Webhook Notification',
    config_notifier_wechatbot: 'WeCom Bot',
    config_notifier_email: 'Email Notification',
    config_notifier_serverchan: 'ServerChan',
```

Then update these exact lines in `src/views/configPage.html`:

```html
<p class="mt-1 text-sm text-gray-500" data-i18n="config_admin_password_help">???????????</p>
```

```html
<p class="mt-1 text-sm text-gray-500" data-i18n="config_theme_help">?????????</p>
```

```html
<span class="ml-2 text-sm text-gray-700" data-i18n="config_notifier_webhook">Webhook Notification</span>
```

```html
<span class="ml-2 text-sm text-gray-700" data-i18n="config_notifier_wechatbot">WeCom Bot</span>
```

```html
<span class="ml-2 text-sm text-gray-700" data-i18n="config_notifier_email">Email Notification</span>
```

```html
<span class="ml-2 text-sm text-gray-700" data-i18n="config_notifier_serverchan">ServerChan</span>
```

Do not change the notifier values (`value="webhook"`, `value="wechatbot"`, etc.); only localise the user-facing labels.

- [ ] **Step 4: Re-run the config regression tests**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js tests/views/config-page-discord.test.js tests/core/locale.test.js
```

Expected: PASS.

- [ ] **Step 5: Leave the working tree uncommitted**

Do not create a git commit.

---

### Task 4: Finish admin filters, list/table states, and row-level browser-visible strings

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/adminPage.html`
- Modify: `src/core/locale.js`

- [ ] **Step 1: Add failing admin regression assertions**

Extend the existing `admin page localises second-wave filters, table labels, and runtime actions` test in `tests/views/browser-ui-localisation.test.js` with these assertions:

```js
  assert.equal(adminPageHtml.includes('data-i18n="admin_filter_cycle"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_filter_reset"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_filter_all_categories"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_show_lunar"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_type"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_expiry"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_amount"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_reminder"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_status"'), true);
  assert.equal(adminPageHtml.includes('data-i18n="admin_table_col_actions"'), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_status_paused'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_status_expired'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_status_normal'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_load_failed_table'"), true);
  assert.equal(adminPageHtml.includes('????'), false);
  assert.equal(adminPageHtml.includes('????'), false);
  assert.equal(adminPageHtml.includes('????????????'), false);
```

- [ ] **Step 2: Run the admin page regression test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `adminPage.html` still contains untranslated filter options, table headings, row-status text, and load-failure text.

- [ ] **Step 3: Add the remaining admin list/table locale keys**

Add these keys to `src/core/locale.js`:

```js
    admin_filter_cycle: '????',
    admin_filter_reset: '????',
    admin_filter_all_categories: '????',
    admin_show_lunar: '????',
    admin_table_col_type: '??',
    admin_table_col_expiry: '??',
    admin_table_col_amount: '??',
    admin_table_col_reminder: '??',
    admin_table_col_status: '??',
    admin_table_col_actions: '??',
    admin_status_paused: '???',
    admin_status_expired: '???',
    admin_status_normal: '??',
    admin_load_failed_table: '????????????',
    admin_load_failed_toast: '????????',
```

```js
    admin_filter_cycle: 'Recurring',
    admin_filter_reset: 'Reset on Expiry',
    admin_filter_all_categories: 'All Categories',
    admin_show_lunar: 'Show Lunar Dates',
    admin_table_col_type: 'Type',
    admin_table_col_expiry: 'Expiry',
    admin_table_col_amount: 'Amount',
    admin_table_col_reminder: 'Reminder',
    admin_table_col_status: 'Status',
    admin_table_col_actions: 'Actions',
    admin_status_paused: 'Paused',
    admin_status_expired: 'Expired',
    admin_status_normal: 'Normal',
    admin_load_failed_table: 'Failed to load. Please refresh and try again.',
    admin_load_failed_toast: 'Failed to load the subscription list',
```

- [ ] **Step 4: Replace the remaining admin filter, header, and row-state strings**

In `src/views/adminPage.html`, update the static filter/header markup to this exact form:

```html
<option value="cycle" data-i18n="admin_filter_cycle">Recurring</option>
<option value="reset" data-i18n="admin_filter_reset">Reset on Expiry</option>
<option value="" data-i18n="admin_filter_all_categories">All Categories</option>
<span class="text-gray-700" data-i18n="admin_show_lunar">Show Lunar Dates</span>
<span data-i18n="admin_table_col_type">Type</span>
<span data-i18n="admin_table_col_expiry">Expiry</span>
<span data-i18n="admin_table_col_amount">Amount</span>
<span data-i18n="admin_table_col_reminder">Reminder</span>
<span data-i18n="admin_table_col_status">Status</span>
<span data-i18n="admin_table_col_actions">Actions</span>
```

Then replace the remaining browser-visible runtime strings in the row builder and load-failure path:

```js
          statusHtml = '<span class="px-2 py-1 text-xs font-medium rounded-full text-white bg-gray-500"><i class="fas fa-pause-circle mr-1"></i>' + window.AppLocale.getMessage('admin_status_paused', window.AppLocale.getPreferredLocale()) + '</span>';
```

```js
          statusHtml = '<span class="px-2 py-1 text-xs font-medium rounded-full text-white bg-red-500"><i class="fas fa-exclamation-circle mr-1"></i>' + window.AppLocale.getMessage('admin_status_expired', window.AppLocale.getPreferredLocale()) + '</span>';
```

```js
          statusHtml = '<span class="px-2 py-1 text-xs font-medium rounded-full text-white bg-green-500"><i class="fas fa-check-circle mr-1"></i>' + window.AppLocale.getMessage('admin_status_normal', window.AppLocale.getPreferredLocale()) + '</span>';
```

```js
          tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>' + window.AppLocale.getMessage('admin_load_failed_table', window.AppLocale.getPreferredLocale()) + '</td></tr>';
          showToast(window.AppLocale.getMessage('admin_load_failed_toast', window.AppLocale.getPreferredLocale()), 'error');
```

- [ ] **Step 5: Re-run the admin/browser localisation regression tests**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js
```

Expected: PASS.

- [ ] **Step 6: Leave the working tree uncommitted**

Do not create a git commit.

---

### Task 5: Finish admin renewal/payment modal copy and run the full regression suite

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`
- Modify: `src/views/adminPage.html`
- Modify: `src/core/locale.js`

- [ ] **Step 1: Add failing modal/local-runtime assertions**

Append these assertions to `tests/views/browser-ui-localisation.test.js` inside the existing `admin page localises second-wave filters, table labels, and runtime actions` test:

```js
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_payment_date'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_payment_amount'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_note'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_close'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_edit_payment_title'"), true);
  assert.equal(adminPageHtml.includes("window.AppLocale.getMessage('admin_delete_payment_confirm'"), true);
  assert.equal(adminPageHtml.includes('????'), false);
  assert.equal(adminPageHtml.includes('??????'), false);
  assert.equal(adminPageHtml.includes('?????????'), false);
```

- [ ] **Step 2: Run the targeted admin/browser tests to verify they fail**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because the renew modal, payment history modal, and edit payment modal still contain hardcoded Chinese browser-visible labels.

- [ ] **Step 3: Localise the remaining admin modal strings**

In `src/views/adminPage.html`, replace these renew-modal labels with locale lookups:

```js
'                <label class="block text-sm font-medium text-gray-700 mb-1">' + window.AppLocale.getMessage('admin_payment_date', window.AppLocale.getPreferredLocale()) + '</label>' +
```

```js
'                <label class="block text-sm font-medium text-gray-700 mb-1">' + window.AppLocale.getMessage('admin_payment_amount', window.AppLocale.getPreferredLocale()) + ' ' + currencyLabel + '</label>' +
```

```js
'                <label class="block text-sm font-medium text-gray-700 mb-1">' + window.AppLocale.getMessage('admin_note', window.AppLocale.getPreferredLocale()) + ' (Optional)</label>' +
```

In the payment history modal block, replace:

```js
<div class="text-sm text-gray-600">${window.AppLocale.getMessage('admin_total_spend', window.AppLocale.getPreferredLocale())}</div>
<div class="text-sm text-gray-600">${window.AppLocale.getMessage('admin_payment_count', window.AppLocale.getPreferredLocale())}</div>
<button onclick="closePaymentHistoryModal()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">${window.AppLocale.getMessage('admin_close', window.AppLocale.getPreferredLocale())}</button>
```

Replace the delete/edit payment runtime strings with:

```js
        if (!confirm(window.AppLocale.getMessage('admin_delete_payment_confirm', window.AppLocale.getPreferredLocale()))) {
```

```js
                showToast(result.message || window.AppLocale.getMessage('admin_payment_deleted', window.AppLocale.getPreferredLocale()), 'success');
```

```js
                showToast(result.message || window.AppLocale.getMessage('admin_delete_failed', window.AppLocale.getPreferredLocale()), 'error');
```

```js
            showToast(window.AppLocale.getMessage('admin_delete_error', window.AppLocale.getPreferredLocale()), 'error');
```

```js
                showToast(window.AppLocale.getMessage('admin_payment_not_found', window.AppLocale.getPreferredLocale()), 'error');
```

```js
            showToast(window.AppLocale.getMessage('admin_payment_fetch_error', window.AppLocale.getPreferredLocale()), 'error');
```

And replace the edit-payment modal heading and labels with:

```js
<i class="fas fa-edit mr-2"></i>${window.AppLocale.getMessage('admin_edit_payment_title', window.AppLocale.getPreferredLocale())}
```

```js
<label class="block text-sm font-medium text-gray-700 mb-1">${window.AppLocale.getMessage('admin_subscription_name', window.AppLocale.getPreferredLocale())}</label>
<label class="block text-sm font-medium text-gray-700 mb-1">${window.AppLocale.getMessage('admin_payment_date', window.AppLocale.getPreferredLocale())}</label>
<label class="block text-sm font-medium text-gray-700 mb-1">${window.AppLocale.getMessage('admin_payment_amount', window.AppLocale.getPreferredLocale())} (${subscription.currency || 'MYR'} ${getCurrencySymbol(payment.currency || subscription.currency)})</label>
<label class="block text-sm font-medium text-gray-700 mb-1">${window.AppLocale.getMessage('admin_note', window.AppLocale.getPreferredLocale())}</label>
```

Also add any missing locale keys referenced above to `src/core/locale.js` in both `zh` and `en` blocks.

- [ ] **Step 4: Run the targeted admin regression tests**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js tests/views/config-page-discord.test.js
```

Expected: PASS.

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
- Remaining browser-visible dashboard strings: covered by Task 2.
- Remaining browser-visible config strings and notifier/help text: covered by Task 3.
- Remaining browser-visible admin strings, including dynamic list/table states: covered by Task 4.
- Remaining browser-visible admin modal/payment/renew/edit strings: covered by Task 5.
- Login remains regression-only unless new gaps are discovered during execution.
- Source-hygiene protections against `???` and literal `\uXXXX` regressions: covered by Tasks 1, 2, 4, and 5 test additions.

### Placeholder scan
- No `TODO`, `TBD`, or deferred placeholders remain.
- Each task includes exact file paths, concrete code snippets, and exact verification commands.
- The plan does not rely on �similar to Task N� shortcuts.

### Type consistency
- Shared browser helper calls consistently use `window.AppLocale.getMessage(key, window.AppLocale.getPreferredLocale(), params)`.
- Page-level locale-tag usage consistently uses `getLocaleTag()` where browser date formatting is required.
- Locale key names follow the existing `dashboard_*`, `config_*`, and `admin_*` prefixes throughout the plan.
