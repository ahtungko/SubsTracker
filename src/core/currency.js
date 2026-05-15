import { MS_PER_DAY, getCurrentTimeInTimezone, getTimezoneDateParts } from './time.js';

const CATEGORY_SEPARATOR_REGEX = /[\/\uFF0C,\s]+/;
const DEFAULT_CURRENCY = 'MYR';
const SUPPORTED_CURRENCIES = ['MYR', 'CNY', 'USD', 'HKD', 'TWD', 'JPY', 'EUR', 'GBP', 'KRW', 'TRY'];

// MYR-based fallback rates used when the Wise API is unavailable
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
    const list = Array.isArray(items)
      ? items
      : (items && typeof items === 'object' ? [items] : []);
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
  const CACHE_TTL = 86400000; // 24 hours
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
  }

  return FALLBACK_RATES;
}

function convertToMYR(amount, currency, rates) {
  if (!amount || amount <= 0) return 0;
  const code = normalizeCurrencyCode(currency);
  if (code === DEFAULT_CURRENCY) return amount;
  const rate = rates[code];
  if (!rate) return amount;
  return amount * rate;
}

function calculateMonthlyExpense(subscriptions, timezone, rates) {
  const now = getCurrentTimeInTimezone(timezone);
  const parts = getTimezoneDateParts(now, timezone);
  const currentYear = parts.year;
  const currentMonth = parts.month;

  let amount = 0;
  subscriptions.forEach(sub => {
    const paymentHistory = sub.paymentHistory || [];
    paymentHistory.forEach(payment => {
      if (!payment.amount || payment.amount <= 0) return;
      const paymentDate = new Date(payment.date);
      const paymentParts = getTimezoneDateParts(paymentDate, timezone);
      if (paymentParts.year === currentYear && paymentParts.month === currentMonth) {
        amount += convertToMYR(payment.amount, sub.currency, rates);
      }
    });
  });

  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  let lastMonthAmount = 0;
  subscriptions.forEach(sub => {
    const paymentHistory = sub.paymentHistory || [];
    paymentHistory.forEach(payment => {
      if (!payment.amount || payment.amount <= 0) return;
      const paymentDate = new Date(payment.date);
      const paymentParts = getTimezoneDateParts(paymentDate, timezone);
      if (paymentParts.year === lastMonthYear && paymentParts.month === lastMonth) {
        lastMonthAmount += convertToMYR(payment.amount, sub.currency, rates);
      }
    });
  });

  let trend = 0;
  let trendDirection = 'flat';
  if (lastMonthAmount > 0) {
    trend = Math.round(((amount - lastMonthAmount) / lastMonthAmount) * 100);
    if (trend > 0) trendDirection = 'up';
    else if (trend < 0) trendDirection = 'down';
  } else if (amount > 0) {
    trend = 100;
    trendDirection = 'up';
  }
  return { amount, trend: Math.abs(trend), trendDirection };
}

function calculateYearlyExpense(subscriptions, timezone, rates) {
  const now = getCurrentTimeInTimezone(timezone);
  const parts = getTimezoneDateParts(now, timezone);
  const currentYear = parts.year;

  let amount = 0;
  subscriptions.forEach(sub => {
    const paymentHistory = sub.paymentHistory || [];
    paymentHistory.forEach(payment => {
      if (!payment.amount || payment.amount <= 0) return;
      const paymentDate = new Date(payment.date);
      const paymentParts = getTimezoneDateParts(paymentDate, timezone);
      if (paymentParts.year === currentYear) {
        amount += convertToMYR(payment.amount, sub.currency, rates);
      }
    });
  });

  const monthlyAverage = amount / parts.month;
  return { amount, monthlyAverage };
}

function getRecentPayments(subscriptions, timezone) {
  const now = getCurrentTimeInTimezone(timezone);
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY);
  const recentPayments = [];
  subscriptions.forEach(sub => {
    const paymentHistory = sub.paymentHistory || [];
    paymentHistory.forEach(payment => {
      if (!payment.amount || payment.amount <= 0) return;
      const paymentDate = new Date(payment.date);
      if (paymentDate >= sevenDaysAgo && paymentDate <= now) {
        recentPayments.push({
          name: sub.name,
          amount: payment.amount,
          currency: normalizeCurrencyCode(sub.currency),
          customType: sub.customType,
          paymentDate: payment.date,
          note: payment.note
        });
      }
    });
  });
  return recentPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
}

function getUpcomingRenewals(subscriptions, timezone) {
  const now = getCurrentTimeInTimezone(timezone);
  const sevenDaysLater = new Date(now.getTime() + 7 * MS_PER_DAY);
  return subscriptions
    .filter(sub => {
      if (!sub.isActive) return false;
      const renewalDate = new Date(sub.expiryDate);
      return renewalDate >= now && renewalDate <= sevenDaysLater;
    })
    .map(sub => {
      const renewalDate = new Date(sub.expiryDate);
      const daysUntilRenewal = Math.ceil((renewalDate - now) / MS_PER_DAY);
      return {
        name: sub.name,
        amount: sub.amount || 0,
        currency: normalizeCurrencyCode(sub.currency),
        customType: sub.customType,
        renewalDate: sub.expiryDate,
        daysUntilRenewal
      };
    })
    .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
}

function getExpenseByType(subscriptions, timezone, rates) {
  const now = getCurrentTimeInTimezone(timezone);
  const parts = getTimezoneDateParts(now, timezone);
  const currentYear = parts.year;
  const typeMap = {};
  let total = 0;
  subscriptions.forEach(sub => {
    const paymentHistory = sub.paymentHistory || [];
    paymentHistory.forEach(payment => {
      if (!payment.amount || payment.amount <= 0) return;
      const paymentDate = new Date(payment.date);
      const paymentParts = getTimezoneDateParts(paymentDate, timezone);
      if (paymentParts.year === currentYear) {
        const type = sub.customType || '未分类';
        const amountMYR = convertToMYR(payment.amount, sub.currency, rates);
        typeMap[type] = (typeMap[type] || 0) + amountMYR;
        total += amountMYR;
      }
    });
  });

  return Object.entries(typeMap)
    .map(([type, amount]) => ({
      type,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

function getExpenseByCategory(subscriptions, timezone, rates) {
  const now = getCurrentTimeInTimezone(timezone);
  const parts = getTimezoneDateParts(now, timezone);
  const currentYear = parts.year;

  const categoryMap = {};
  let total = 0;
  subscriptions.forEach(sub => {
    const paymentHistory = sub.paymentHistory || [];
    paymentHistory.forEach(payment => {
      if (!payment.amount || payment.amount <= 0) return;
      const paymentDate = new Date(payment.date);
      const paymentParts = getTimezoneDateParts(paymentDate, timezone);
      if (paymentParts.year === currentYear) {
        const categories = sub.category ? sub.category.split(CATEGORY_SEPARATOR_REGEX).filter(c => c.trim()) : ['未分类'];
        const amountMYR = convertToMYR(payment.amount, sub.currency, rates);

        categories.forEach(category => {
          const cat = category.trim() || '未分类';
          categoryMap[cat] = (categoryMap[cat] || 0) + amountMYR / categories.length;
        });
        total += amountMYR;
      }
    });
  });

  return Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

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
