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
