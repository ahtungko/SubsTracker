import test from 'node:test';
import assert from 'node:assert/strict';

import { formatTimeInTimezone, formatTimezoneDisplay } from '../../src/core/time.js';

test('server-side formatTimezoneDisplay still labels Kuala Lumpur with UTC+8', () => {
  assert.equal(formatTimezoneDisplay('Asia/Kuala_Lumpur'), '\u5409\u9686\u5761\u65f6\u95f4 (UTC+8)');
});

test('server-side time helpers support English timezone labels and formatting for notifications', () => {
  assert.equal(formatTimezoneDisplay('Asia/Kuala_Lumpur', 'en'), 'Kuala Lumpur Time (UTC+8)');
  assert.match(
    formatTimeInTimezone(new Date('2026-05-17T07:57:36.000Z'), 'Asia/Kuala_Lumpur', 'datetime', 'en'),
    /^05\/17\/2026, 15:57:36$/
  );
});
