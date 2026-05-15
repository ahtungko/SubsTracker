# MYR Default + Wise Rates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the app from CNY-based reporting/defaults to full MYR support, using Wise Sandbox V2 as the exchange-rate source and preserving explicit existing CNY records.

**Architecture:** Keep the current modular structure, but replace Frankfurter/CNY assumptions in `src/core/currency.js` with a MYR-based Wise rate map and a small normalization helper that other modules reuse. Then update creation/display defaults in data and UI layers so missing currencies become MYR, explicit CNY stays intact, and dashboard/reporting text consistently reflects MYR.

**Tech Stack:** Cloudflare Workers JavaScript, Node built-in test runner, Wise Sandbox V2 HTTP API, KV cache, npm, git

---

## File Structure

**Create**

- `tests/core/currency-myr.test.js`
- `tests/data/subscriptions-myr.test.js`
- `tests/views/currency-myr.test.js`

**Modify**

- `src/core/currency.js`
- `src/data/subscriptions.js`
- `src/api/handlers/subscriptions.js`
- `src/services/notify/reminder.js`
- `src/views/adminPage.html`
- `src/views/dashboardPage.html`

---

### Task 1: Replace the CNY/Frankfurter currency engine with MYR/Wise logic

**Files:**
- Create: `tests/core/currency-myr.test.js`
- Modify: `src/core/currency.js`

- [ ] **Step 1: Write the failing test**

Create `tests/core/currency-myr.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
  SUPPORTED_CURRENCIES,
  normalizeCurrencyCode,
  buildRateMapFromWiseResponses,
  convertToMYR,
  getDynamicRates
} from '../../src/core/currency.js';

test('currency engine defaults and normalization now use MYR', () => {
  assert.equal(DEFAULT_CURRENCY, 'MYR');
  assert.ok(SUPPORTED_CURRENCIES.includes('MYR'));
  assert.equal(normalizeCurrencyCode(undefined), 'MYR');
  assert.equal(normalizeCurrencyCode(''), 'MYR');
  assert.equal(normalizeCurrencyCode('   '), 'MYR');
  assert.equal(normalizeCurrencyCode('cny'), 'CNY');
  assert.equal(normalizeCurrencyCode('MYR'), 'MYR');
});

test('buildRateMapFromWiseResponses builds a MYR-based route map', () => {
  const rates = buildRateMapFromWiseResponses('MYR', [
    { source: 'USD', target: 'MYR', rate: 4.2 },
    { source: 'CNY', target: 'MYR', rate: 0.61 },
    { source: 'EUR', target: 'MYR', rate: 4.95 }
  ]);

  assert.deepEqual(rates, {
    ...FALLBACK_RATES,
    MYR: 1,
    USD: 4.2,
    CNY: 0.61,
    EUR: 4.95
  });
});

test('convertToMYR converts with MYR as the reporting base', () => {
  const rates = {
    MYR: 1,
    USD: 4,
    CNY: 0.6
  };

  assert.equal(convertToMYR(10, 'MYR', rates), 10);
  assert.equal(convertToMYR(10, 'USD', rates), 40);
  assert.equal(convertToMYR(10, 'CNY', rates), 6);
  assert.equal(convertToMYR(0, 'USD', rates), 0);
});

test('getDynamicRates falls back to MYR-based rates when Wise token is missing', async () => {
  const env = {
    SUBSCRIPTIONS_KV: {
      get: async () => null,
      put: async () => {}
    }
  };

  const rates = await getDynamicRates(env);

  assert.equal(rates.MYR, 1);
  assert.equal(rates.CNY, FALLBACK_RATES.CNY);
  assert.equal(rates.USD, FALLBACK_RATES.USD);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/core/currency-myr.test.js
```

Expected: FAIL with at least one of these reasons:
- `DEFAULT_CURRENCY` not exported / undefined
- normalization still defaults to `CNY`
- `convertToMYR` not defined
- `getDynamicRates` still uses Frankfurter/CNY assumptions

- [ ] **Step 3: Write minimal implementation**

Replace the top of `src/core/currency.js` with a MYR-based model and new helpers:

```js
import { MS_PER_DAY, getCurrentTimeInTimezone, getTimezoneDateParts } from './time.js';

const CATEGORY_SEPARATOR_REGEX = /[\/\uFF0C,\s]+/;
const DEFAULT_CURRENCY = 'MYR';
const SUPPORTED_CURRENCIES = ['MYR', 'CNY', 'USD', 'HKD', 'TWD', 'JPY', 'EUR', 'GBP', 'KRW', 'TRY'];

const FALLBACK_RATES = {
  MYR: 1,
  CNY: 0.58,
  USD: 3.93,
  HKD: 0.54,
  TWD: 0.125,
  JPY: 0.0249,
  EUR: 4.59,
  GBP: 5.30,
  KRW: 0.0030,
  TRY: 0.10
};

function normalizeCurrencyCode(currency, defaultCode = DEFAULT_CURRENCY) {
  if (typeof currency !== 'string') return defaultCode;
  const code = currency.trim().toUpperCase();
  return code || defaultCode;
}

function buildRateMapFromWiseResponses(baseCurrency, responses = []) {
  const rates = { ...FALLBACK_RATES, [baseCurrency]: 1 };

  responses.forEach((items) => {
    const list = Array.isArray(items) ? items : [];
    list.forEach((item) => {
      if (!item || item.target !== baseCurrency || !item.source || !Number.isFinite(Number(item.rate))) return;
      rates[item.source] = Number(item.rate);
    });
  });

  return rates;
}

async function fetchWiseRouteRate(source, target, token) {
  const response = await fetch(`https://api.wise-sandbox.com/v1/rates?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Wise route ${source}->${target} failed: ${response.status}`);
  }

  return response.json();
}

async function getDynamicRates(env) {
  const CACHE_KEY = 'SYSTEM_EXCHANGE_RATES';
  const CACHE_TTL = 86400000;
  const token = env.WISE_SANDBOX_TOKEN;

  try {
    const cached = await env.SUBSCRIPTIONS_KV.get(CACHE_KEY, { type: 'json' });
    if (cached && cached.ts && (Date.now() - cached.ts < CACHE_TTL)) {
      return cached.rates;
    }

    if (!token) {
      console.warn('[rates] missing WISE_SANDBOX_TOKEN, using MYR fallback rates');
      return FALLBACK_RATES;
    }

    const routes = await Promise.allSettled(
      SUPPORTED_CURRENCIES
        .filter(code => code !== DEFAULT_CURRENCY)
        .map(code => fetchWiseRouteRate(code, DEFAULT_CURRENCY, token))
    );

    const fulfilled = routes
      .filter(item => item.status === 'fulfilled')
      .map(item => item.value);

    const newRates = buildRateMapFromWiseResponses(DEFAULT_CURRENCY, fulfilled);

    await env.SUBSCRIPTIONS_KV.put(CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      rates: newRates
    }));

    return newRates;
  } catch (error) {
    console.error('[rates] failed to fetch Wise rates:', error);
    return FALLBACK_RATES;
  }
}

function convertToMYR(amount, currency, rates) {
  if (!amount || amount <= 0) return 0;
  const code = normalizeCurrencyCode(currency);
  if (code === DEFAULT_CURRENCY) return amount;
  const rate = rates[code];
  if (!rate) return amount;
  return amount * rate;
}
```

Then replace all `convertToCNY(...)` calls inside `src/core/currency.js` with `convertToMYR(...)`, replace default/fallback currency usage from `CNY` to `DEFAULT_CURRENCY`, and update exports:

```js
export {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES,
  normalizeCurrencyCode,
  buildRateMapFromWiseResponses,
  getDynamicRates,
  convertToMYR,
  calculateMonthlyExpense,
  calculateYearlyExpense,
  getRecentPayments,
  getUpcomingRenewals,
  getExpenseByType,
  getExpenseByCategory
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/core/currency-myr.test.js
```

Expected: PASS with 4 passing tests and exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add tests/core/currency-myr.test.js src/core/currency.js
git commit -m "feat: switch currency engine to myr and wise"
```

### Task 2: Normalize missing currency values to MYR in subscription/payment data paths

**Files:**
- Create: `tests/data/subscriptions-myr.test.js`
- Modify: `src/data/subscriptions.js`

- [ ] **Step 1: Write the failing test**

Create `tests/data/subscriptions-myr.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { createSubscription, updateSubscription, getAllSubscriptions } from '../../src/data/subscriptions.js';

function createEnv(initialSubscriptions = []) {
  const store = new Map([
    ['subscriptions', JSON.stringify(initialSubscriptions)],
    ['config', JSON.stringify({ JWT_SECRET: 'jwt-secret', PAYMENT_HISTORY_LIMIT: 100 })]
  ]);

  return {
    SUBSCRIPTIONS_KV: {
      get: async (key) => store.get(key) ?? null,
      put: async (key, value) => {
        store.set(key, value);
      }
    },
    __store: store
  };
}

test('getAllSubscriptions backfills empty stored currencies to MYR while preserving explicit CNY', async () => {
  const env = createEnv([
    {
      id: 'stored-1',
      name: 'Stored Empty',
      expiryDate: '2030-01-01T00:00:00.000Z',
      currency: '',
      paymentHistory: [{ id: 'sp1', type: 'initial', amount: 9, currency: '' }],
      isActive: true
    },
    {
      id: 'stored-2',
      name: 'Stored CNY',
      expiryDate: '2030-01-01T00:00:00.000Z',
      currency: 'CNY',
      paymentHistory: [{ id: 'sp2', type: 'initial', amount: 19, currency: 'CNY' }],
      isActive: true
    }
  ]);

  const subscriptions = await getAllSubscriptions(env);

  assert.equal(subscriptions[0].currency, 'MYR');
  assert.equal(subscriptions[0].paymentHistory[0].currency, 'MYR');
  assert.equal(subscriptions[1].currency, 'CNY');
  assert.equal(subscriptions[1].paymentHistory[0].currency, 'CNY');
});

test('createSubscription defaults missing currency values to MYR', async () => {
  const env = createEnv();

  const result = await createSubscription({
    name: 'Netflix',
    expiryDate: '2030-01-01T00:00:00.000Z',
    amount: 10
  }, env);

  assert.equal(result.success, true);
  assert.equal(result.subscription.currency, 'MYR');
  assert.equal(result.subscription.paymentHistory[0].currency, 'MYR');
});

test('createSubscription keeps explicit existing CNY currency', async () => {
  const env = createEnv();

  const result = await createSubscription({
    name: 'iQIYI',
    expiryDate: '2030-01-01T00:00:00.000Z',
    amount: 20,
    currency: 'CNY'
  }, env);

  assert.equal(result.success, true);
  assert.equal(result.subscription.currency, 'CNY');
  assert.equal(result.subscription.paymentHistory[0].currency, 'CNY');
});

test('updateSubscription backfills empty stored currency to MYR without rewriting explicit CNY', async () => {
  const env = createEnv([
    {
      id: 'sub-1',
      name: 'Spotify',
      expiryDate: '2030-01-01T00:00:00.000Z',
      periodValue: 1,
      periodUnit: 'month',
      notes: '',
      amount: 15,
      currency: '',
      paymentHistory: [{ id: 'p1', type: 'initial', amount: 15, currency: '' }],
      isActive: true,
      autoRenew: true,
      useLunar: false,
      createdAt: '2029-01-01T00:00:00.000Z'
    },
    {
      id: 'sub-2',
      name: 'Tencent Video',
      expiryDate: '2030-01-01T00:00:00.000Z',
      periodValue: 1,
      periodUnit: 'month',
      notes: '',
      amount: 25,
      currency: 'CNY',
      paymentHistory: [{ id: 'p2', type: 'initial', amount: 25, currency: 'CNY' }],
      isActive: true,
      autoRenew: true,
      useLunar: false,
      createdAt: '2029-01-01T00:00:00.000Z'
    }
  ]);

  const first = await updateSubscription('sub-1', {
    name: 'Spotify',
    expiryDate: '2030-01-01T00:00:00.000Z'
  }, env);
  const second = await updateSubscription('sub-2', {
    name: 'Tencent Video',
    expiryDate: '2030-01-01T00:00:00.000Z'
  }, env);

  assert.equal(first.success, true);
  assert.equal(first.subscription.currency, 'MYR');

  assert.equal(second.success, true);
  assert.equal(second.subscription.currency, 'CNY');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/data/subscriptions-myr.test.js
```

Expected: FAIL because current create/update flows still default missing values to `CNY`.

- [ ] **Step 3: Write minimal implementation**

At the top of `src/data/subscriptions.js`, update imports:

```js
import { getConfig } from './config.js';
import { getCurrentTimeInTimezone, getTimezoneMidnightTimestamp } from '../core/time.js';
import { lunarCalendar, lunarBiz } from '../core/lunar.js';
import { resolveReminderSetting } from '../services/notify/reminder.js';
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from '../core/currency.js';
```

In `createSubscription`, replace the hardcoded CNY defaults:

```js
      amount: subscription.amount !== undefined && subscription.amount !== null ? subscription.amount : null,
      currency: normalizeCurrencyCode(subscription.currency),
      lastPaymentDate: initialPaymentDate,
      paymentHistory: subscription.amount !== undefined && subscription.amount !== null ? [{
        id: Date.now().toString(),
        date: initialPaymentDate,
        amount: subscription.amount,
        currency: normalizeCurrencyCode(subscription.currency),
        type: 'initial',
        note: 'Initial subscription',
        periodStart: subscription.startDate || initialPaymentDate,
        periodEnd: subscription.expiryDate
      }] : [],
```

In `updateSubscription`, normalize the initial payment currency and subscription currency:

```js
    if (newAmount !== oldSubscription.amount || (subscription.currency !== undefined && subscription.currency !== oldSubscription.currency)) {
      const initialPaymentIndex = paymentHistory.findIndex(p => p.type === 'initial');
      if (initialPaymentIndex !== -1) {
        paymentHistory[initialPaymentIndex] = {
          ...paymentHistory[initialPaymentIndex],
          amount: newAmount,
          currency: normalizeCurrencyCode(subscription.currency ?? oldSubscription.currency)
        };
      }
    }
```

```js
      amount: newAmount,
      currency: normalizeCurrencyCode(subscription.currency ?? subscriptions[index].currency),
```

In manual renew / payment update flows, replace CNY defaults:

```js
      currency: normalizeCurrencyCode(subscription.currency),
```

and:

```js
      currency: normalizeCurrencyCode(paymentData.currency ?? paymentHistory[paymentIndex].currency ?? subscription.currency ?? DEFAULT_CURRENCY),
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/data/subscriptions-myr.test.js
```

Expected: PASS with 3 passing tests and exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add tests/data/subscriptions-myr.test.js src/data/subscriptions.js
git commit -m "feat: default missing subscription currency to myr"
```

### Task 3: Update MYR symbols/defaults in handler, reminder, admin, and dashboard UI

**Files:**
- Create: `tests/views/currency-myr.test.js`
- Modify: `src/api/handlers/subscriptions.js`
- Modify: `src/services/notify/reminder.js`
- Modify: `src/views/adminPage.html`
- Modify: `src/views/dashboardPage.html`

- [ ] **Step 1: Write the failing test**

Create `tests/views/currency-myr.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const adminPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/adminPage.html'), 'utf8');
const dashboardPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/dashboardPage.html'), 'utf8');
const reminderJs = fs.readFileSync(path.join(repoRoot, 'src/services/notify/reminder.js'), 'utf8');
const subscriptionsHandlerJs = fs.readFileSync(path.join(repoRoot, 'src/api/handlers/subscriptions.js'), 'utf8');

test('admin page exposes MYR as the default currency option', () => {
  assert.match(adminPageHtml, /<option value="MYR" selected>MYR \(RM\)<\/option>/);
  assert.match(adminPageHtml, /document\.getElementById\('currency'\)\.value = 'MYR'/);
  assert.match(adminPageHtml, /subscription\.currency \|\| 'MYR'/);
});

test('all currency symbol maps include MYR with RM symbol', () => {
  assert.match(adminPageHtml, /'MYR': 'RM'/);
  assert.match(dashboardPageHtml, /'MYR': 'RM'/);
  assert.match(reminderJs, /MYR: 'RM'/);
  assert.match(subscriptionsHandlerJs, /MYR: 'RM'/);
});

test('dashboard copy and totals now reference MYR instead of CNY', () => {
  assert.match(dashboardPageHtml, /??MYR/);
  assert.match(dashboardPageHtml, /???? \(MYR\)/);
  assert.match(dashboardPageHtml, /???? \(MYR\)/);
  assert.doesNotMatch(dashboardPageHtml, /???? \(CNY\)/);
  assert.match(dashboardPageHtml, /RM\$\{data\.monthlyExpense\.amount\.toFixed\(2\)\}/);
  assert.match(dashboardPageHtml, /RM\$\{data\.yearlyExpense\.amount\.toFixed\(2\)\}/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/views/currency-myr.test.js
```

Expected: FAIL because UI/default text still references `CNY` and symbol maps do not include `MYR`.

- [ ] **Step 3: Write minimal implementation**

In `src/api/handlers/subscriptions.js`, update the symbol map and default fallback:

```js
    const currencySymbols = {
      MYR: 'RM', CNY: '¥', USD: '$', HKD: 'HK$', TWD: 'NT$',
      JPY: '¥', EUR: '€', GBP: '£', KRW: '₩', TRY: '₺'
    };
    const amountCurrency = currencySymbols[subscription.currency || 'MYR'] || 'RM';
```

In `src/services/notify/reminder.js`, update the symbol map and default fallback:

```js
    const currencySymbols = {
      MYR: 'RM', CNY: '¥', USD: '$', HKD: 'HK$', TWD: 'NT$',
      JPY: '¥', EUR: '€', GBP: '£', KRW: '₩', TRY: '₺'
    };
    const amountCurrency = currencySymbols[sub.currency || 'MYR'] || 'RM';
```

In `src/views/adminPage.html`, change the dropdown and JS defaults:

```html
                  <option value="MYR" selected>MYR (RM)</option>
                  <option value="CNY">CNY (&yen;)</option>
                  <option value="USD">USD ($)</option>
                  <option value="HKD">HKD (HK$)</option>
                  <option value="TWD">TWD (NT$)</option>
                  <option value="JPY">JPY (&yen;)</option>
                  <option value="EUR">EUR (&euro;)</option>
                  <option value="GBP">GBP (&pound;)</option>
                  <option value="KRW">KRW (&#8361;)</option>
                  <option value="TRY">TRY (&#8378;)</option>
```

Update all admin-page symbol maps:

```js
      const currencySymbols = {
        'MYR': 'RM', 'CNY': '¥', 'USD': '$', 'HKD': 'HK$', 'TWD': 'NT$',
        'JPY': '¥', 'EUR': '€', 'GBP': '£', 'KRW': '₩', 'TRY': '₺'
      };
```

Update admin-page defaults:

```js
      document.getElementById('currency').value = 'MYR';
```

and:

```js
          document.getElementById('currency').value = subscription.currency || 'MYR';
```

In `src/views/dashboardPage.html`, update summary copy, labels, and symbol map:

```html
      <p class="text-sm text-gray-500 mt-1">?????????????????? MYR?</p>
```

```html
          <span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">???? (??MYR)</span>
```

```js
    const currencySymbols = {
      'MYR': 'RM', 'CNY': '¥', 'USD': '$', 'HKD': 'HK$', 'TWD': 'NT$',
      'JPY': '¥', 'EUR': '€', 'GBP': '£', 'KRW': '₩', 'TRY': '₺'
    };
    function getSymbol(currency) {
      return currencySymbols[currency] || 'RM';
    }
```

```js
          <div class="stat-card">
            <div class="stat-card-header">???? (MYR)</div>
            <div class="stat-card-value">RM${data.monthlyExpense.amount.toFixed(2)}</div>
            <div class="stat-card-subtitle">??????</div>
```

```js
          <div class="stat-card">
            <div class="stat-card-header">???? (MYR)</div>
            <div class="stat-card-value">RM${data.yearlyExpense.amount.toFixed(2)}</div>
            <div class="stat-card-subtitle">????: RM${data.yearlyExpense.monthlyAverage.toFixed(2)}</div>
```

and replace ranking display totals from `?` to `RM`:

```js
                <span class="ranking-item-amount">RM${item.amount.toFixed(2)}</span>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/views/currency-myr.test.js
```

Expected: PASS with 3 passing tests and exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add tests/views/currency-myr.test.js src/api/handlers/subscriptions.js src/services/notify/reminder.js src/views/adminPage.html src/views/dashboardPage.html
git commit -m "feat: add myr ui defaults and display support"
```

### Task 4: Run the full MYR/Wise regression suite

**Files:**
- Test: `tests/core/currency-myr.test.js`
- Test: `tests/data/subscriptions-myr.test.js`
- Test: `tests/views/currency-myr.test.js`
- Test: existing `npm test` suite

- [ ] **Step 1: Run the targeted MYR suite**

Run:

```bash
npm test -- tests/core/currency-myr.test.js tests/data/subscriptions-myr.test.js tests/views/currency-myr.test.js
```

Expected: PASS with all MYR-specific tests green and exit code `0`.

- [ ] **Step 2: Run the full project suite**

Run:

```bash
npm test
```

Expected: PASS with zero failures and exit code `0`.

- [ ] **Step 3: Confirm only the intended files changed**

Run:

```bash
git status --short
```

Expected: only the planned MYR/Wise files are modified.

- [ ] **Step 4: Commit final verification state if needed**

If all feature tasks are already committed and the worktree is clean, do not add another code commit. Instead record the recent history:

```bash
git log --oneline --max-count=8
```

Expected: recent commits include:

```text
feat: switch currency engine to myr and wise
feat: default missing subscription currency to myr
feat: add myr ui defaults and display support
```


