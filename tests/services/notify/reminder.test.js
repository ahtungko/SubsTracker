import test from 'node:test';
import assert from 'node:assert/strict';

import { formatNotificationContent } from '../../../src/services/notify/reminder.js';

test('formatNotificationContent uses English reminder labels when NOTIFICATION_LOCALE is en', () => {
  const content = formatNotificationContent([
    {
      name: 'Netflix',
      customType: '',
      periodValue: 1,
      periodUnit: 'month',
      category: '',
      amount: 49.9,
      currency: 'MYR',
      useLunar: false,
      expiryDate: '2026-05-20T00:00:00.000Z',
      autoRenew: true,
      reminderValue: 2,
      reminderUnit: 'day',
      daysRemaining: 2,
      notes: 'Family plan'
    }
  ], {
    NOTIFICATION_LOCALE: 'en',
    TIMEZONE: 'Asia/Kuala_Lumpur',
    SHOW_LUNAR: false
  });

  assert.match(content, /Type: Other \(Billing cycle: 1 month\)/);
  assert.match(content, /Category: Uncategorized/);
  assert.match(content, /Amount: RM49\.90\/cycle/);
  assert.match(content, /Calendar type: Solar/);
  assert.match(content, /Expiry date: 2026\/05\/20/);
  assert.match(content, /Auto renew: Yes/);
  assert.match(content, /Status: Due in 2 day\(s\)/);
  assert.match(content, /Notes: Family plan/);
  assert.match(content, /Sent at:/);
  assert.match(content, /Current timezone: Kuala Lumpur Time \(UTC\+8\)/);
  assert.doesNotMatch(content, /吉隆坡时间/);
  assert.doesNotMatch(content, /类型|分类|金额|日历类型|到期日期|自动续期|到期状态|备注|周期|未分类|其他/);
});
