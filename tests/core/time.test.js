import test from 'node:test';
import assert from 'node:assert/strict';

import { formatTimezoneDisplay } from '../../src/core/time.js';

test('server-side formatTimezoneDisplay still labels Kuala Lumpur with UTC+8', () => {
  assert.equal(formatTimezoneDisplay('Asia/Kuala_Lumpur'), '\u5409\u9686\u5761\u65f6\u95f4 (UTC+8)');
});
