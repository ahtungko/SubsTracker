# Login Page Localisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localise `src/views/loginPage.html` with the existing browser-locale zh/en system so the login page supports localized body text, browser title, and `html lang`, while keeping unsupported locales on English fallback.

**Architecture:** Extend the shared `UI_MESSAGES` catalog with login-specific keys, then apply the existing `AppLocale` browser runtime hooks (`applyDocumentMetadata()` and `applyTranslations()`) to the login page. Keep the work focused on static login UI text and page metadata; do not broaden into a dynamic auth-error framework in this phase.

**Tech Stack:** Cloudflare Workers ESM, inline HTML templates, injected shared browser scripts, Node test runner (`node --experimental-default-type=module --test`)

**User preference:** Do **not** commit during execution. Leave changes uncommitted for user review.

---

## File Structure

### Modify
- `src/core/locale.js` — add login-specific message keys
- `src/views/loginPage.html` — add `data-i18n` markers and metadata hooks for the login page
- `tests/core/locale.test.js` — add coverage for login message keys
- `tests/views/browser-ui-localisation.test.js` — add page-level login localisation coverage

### Leave unchanged in this phase
- `src/views/pages.js`
- `src/views/browser-locale-resources.js`
- admin/dashboard/config localisation behavior
- generic placeholder localisation framework
- toast / confirm / alert localisation
- backend-generated auth error localization beyond existing static strings

---

## Login Message Keys

These exact keys should be added to `UI_MESSAGES` and used in this phase:
- `page_title_login`
- `login_heading`
- `login_subtitle`
- `login_label_username`
- `login_label_password`
- `login_submit`
- `login_submitting`
- `login_error_invalid_credentials`
- `login_error_generic`

Expected values:

### zh
- `page_title_login`: `登录 - 订阅管理系统`
- `login_heading`: `订阅管理系统`
- `login_subtitle`: `登录管理您的订阅提醒`
- `login_label_username`: `用户名`
- `login_label_password`: `密码`
- `login_submit`: `登录`
- `login_submitting`: `登录中...`
- `login_error_invalid_credentials`: `用户名或密码错误`
- `login_error_generic`: `发生错误，请稍后再试`

### en
- `page_title_login`: `Login - Subscription Manager`
- `login_heading`: `Subscription Manager`
- `login_subtitle`: `Sign in to manage your subscription reminders`
- `login_label_username`: `Username`
- `login_label_password`: `Password`
- `login_submit`: `Sign In`
- `login_submitting`: `Signing in...`
- `login_error_invalid_credentials`: `Incorrect username or password`
- `login_error_generic`: `Something went wrong. Please try again later`

---

### Task 1: Extend the shared locale catalog with login keys

**Files:**
- Modify: `tests/core/locale.test.js`
- Modify: `src/core/locale.js`

- [ ] **Step 1: Add failing unit tests for login keys**

Append these tests to `tests/core/locale.test.js`:

```js
test('getMessage returns localized login page strings', () => {
  assert.equal(getMessage('page_title_login', 'zh-CN'), '登录 - 订阅管理系统');
  assert.equal(getMessage('login_heading', 'en-US'), 'Subscription Manager');
  assert.equal(getMessage('login_submit', 'en-US'), 'Sign In');
});

test('getMessage falls back to English for unsupported login locales', () => {
  assert.equal(getMessage('page_title_login', 'ja-JP'), 'Login - Subscription Manager');
  assert.equal(getMessage('login_error_generic', 'ms-MY'), 'Something went wrong. Please try again later');
});
```

Also extend the existing catalog-export test with these assertions:

```js
  assert.equal(UI_MESSAGES.zh.page_title_login, '登录 - 订阅管理系统');
  assert.equal(UI_MESSAGES.en.page_title_login, 'Login - Subscription Manager');
  assert.equal(UI_MESSAGES.zh.login_submit, '登录');
  assert.equal(UI_MESSAGES.en.login_submit, 'Sign In');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: FAIL because the login message keys do not exist yet.

- [ ] **Step 3: Add the login message keys**

In `src/core/locale.js`, add these keys to both locale blocks inside `UI_MESSAGES`.

Add to the `zh` block:

```js
    page_title_login: '登录 - 订阅管理系统',
    login_heading: '订阅管理系统',
    login_subtitle: '登录管理您的订阅提醒',
    login_label_username: '用户名',
    login_label_password: '密码',
    login_submit: '登录',
    login_submitting: '登录中...',
    login_error_invalid_credentials: '用户名或密码错误',
    login_error_generic: '发生错误，请稍后再试',
```

Add to the `en` block:

```js
    page_title_login: 'Login - Subscription Manager',
    login_heading: 'Subscription Manager',
    login_subtitle: 'Sign in to manage your subscription reminders',
    login_label_username: 'Username',
    login_label_password: 'Password',
    login_submit: 'Sign In',
    login_submitting: 'Signing in...',
    login_error_invalid_credentials: 'Incorrect username or password',
    login_error_generic: 'Something went wrong. Please try again later',
```

Place them near the top of each locale block alongside other shared app/page-title keys.

- [ ] **Step 4: Run the locale tests to verify they pass**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js
```

Expected: PASS, including the new login-key coverage.

- [ ] **Step 5: Stop without committing**

Do not create a git commit.

---

### Task 2: Add login page-level localisation regression coverage

**Files:**
- Modify: `tests/views/browser-ui-localisation.test.js`

- [ ] **Step 1: Extend the failing page regression test first**

At the top of `tests/views/browser-ui-localisation.test.js`, add:

```js
const loginPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/loginPage.html'), 'utf8');
```

Then append this test:

```js
test('login page localises title metadata and static body labels', () => {
  assert.equal(loginPageHtml.includes('data-i18n="login_heading"'), true);
  assert.equal(loginPageHtml.includes('data-i18n="login_subtitle"'), true);
  assert.equal(loginPageHtml.includes('data-i18n="login_label_username"'), true);
  assert.equal(loginPageHtml.includes('data-i18n="login_label_password"'), true);
  assert.equal(loginPageHtml.includes('data-i18n="login_submit"'), true);
  assert.equal(loginPageHtml.includes("window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_login' });"), true);
  assert.equal(loginPageHtml.includes('window.AppLocale.applyTranslations();'), true);
});
```

Also append this inline-script safety test:

```js
test('login page inline script still compiles after localisation changes', () => {
  const match = loginPageHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'expected login page HTML to contain an inline script');
  assert.doesNotThrow(() => new Function(match[1]));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-default-type=module --test tests/views/browser-ui-localisation.test.js
```

Expected: FAIL because `loginPage.html` does not yet contain the required `data-i18n` markers or metadata hook.

- [ ] **Step 3: Stop without committing**

Do not create a git commit.

---

### Task 3: Localise login page metadata and static UI text

**Files:**
- Modify: `src/views/loginPage.html`

- [ ] **Step 1: Update the static login page title and metadata hook**

In `src/views/loginPage.html`:

1. Change the title from:

```html
<title>订阅管理系统</title>
```

to the English fallback title:

```html
<title>Login - Subscription Manager</title>
```

2. Near the top of the bottom `<script>` block, insert:

```js
    window.AppLocale.applyDocumentMetadata({ titleKey: 'page_title_login' });
    window.AppLocale.applyTranslations();
```

Place these lines before the existing `document.getElementById('loginForm').addEventListener(...)` code.

- [ ] **Step 2: Add `data-i18n` markers to static login text**

In `src/views/loginPage.html`, update these elements.

Change the main heading from:

```html
<h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-calendar-check mr-2"></i>订阅管理系统</h1>
```

to:

```html
<h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-calendar-check mr-2"></i><span data-i18n="login_heading">订阅管理系统</span></h1>
```

Change the subtitle from:

```html
<p class="text-gray-600 mt-2">登录管理您的订阅提醒</p>
```

to:

```html
<p class="text-gray-600 mt-2" data-i18n="login_subtitle">登录管理您的订阅提醒</p>
```

Change the username label from:

```html
<label for="username" class="block text-sm font-medium text-gray-700 mb-1">
  <i class="fas fa-user mr-2"></i>用户名
</label>
```

to:

```html
<label for="username" class="block text-sm font-medium text-gray-700 mb-1">
  <i class="fas fa-user mr-2"></i><span data-i18n="login_label_username">用户名</span>
</label>
```

Change the password label from:

```html
<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
  <i class="fas fa-lock mr-2"></i>密码
</label>
```

to:

```html
<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
  <i class="fas fa-lock mr-2"></i><span data-i18n="login_label_password">密码</span>
</label>
```

Change the submit button from:

```html
<button type="submit" 
  class="btn-primary w-full py-3 rounded-lg text-white font-medium focus:outline-none">
  <i class="fas fa-sign-in-alt mr-2"></i>登录
</button>
```

to:

```html
<button type="submit" 
  class="btn-primary w-full py-3 rounded-lg text-white font-medium focus:outline-none">
  <i class="fas fa-sign-in-alt mr-2"></i><span data-i18n="login_submit">登录</span>
</button>
```

- [ ] **Step 3: Localise the login script’s static status/error copy**

Inside the login submit handler in `src/views/loginPage.html`, replace:

```js
      button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>登录中...';
```

with:

```js
      button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>' + window.AppLocale.getMessage('login_submitting');
```

Replace:

```js
          document.getElementById('errorMsg').textContent = result.message || '用户名或密码错误';
```

with:

```js
          document.getElementById('errorMsg').textContent = result.message || window.AppLocale.getMessage('login_error_invalid_credentials');
```

Replace:

```js
        document.getElementById('errorMsg').textContent = '发生错误，请稍后再试';
```

with:

```js
        document.getElementById('errorMsg').textContent = window.AppLocale.getMessage('login_error_generic');
```

- [ ] **Step 4: Run the login/localisation regression suite**

Run:

```bash
node --experimental-default-type=module --test tests/core/locale.test.js tests/views/browser-ui-localisation.test.js
```

Expected: PASS. Login page should now satisfy both message-key coverage and page-level localisation assertions.

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
- Login-specific message keys: covered by Task 1.
- Login page title + `html lang`: covered by Task 3 via `applyDocumentMetadata({ titleKey: 'page_title_login' })`.
- Login body-text localisation: covered by Task 3 via `data-i18n` markers.
- Limited dynamic login copy (`logging in`, invalid credentials, generic error): covered by Task 3 without broadening to a general dynamic-message framework.

### Placeholder scan
- No placeholder markers remain.
- Every code-changing step includes exact code snippets.
- Every verification step includes a concrete command and expected outcome.

### Type consistency
- Shared login message keys consistently use the `login_*` prefix.
- Login metadata consistently uses `page_title_login`.
- Page-level hook order remains `applyDocumentMetadata(...)` before `applyTranslations()`.
