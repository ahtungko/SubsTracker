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
