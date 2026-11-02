import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { writeLog } from '../../src/data/scheduler-logs.repo.js';
import { handleDashboardStats } from '../../src/api/handlers/dashboard.js';

describe('localized dashboard with v3 scheduler logs', () => {
  it('preserves history timestamps, delivery state and translation metadata', async () => {
    const startedAt = new Date().toISOString();
    await writeLog(env, {
      startedAt, finishedAt: startedAt, timezone: 'Asia/Kuala_Lumpur', currentHour: '08',
      configuredHours: [], inWindow: true, checkedCount: 1, matchedCount: 1,
      dedupedCount: 0, sentCount: 1, autoRenewedCount: 0, status: 'ok',
      reasonKey: 'dashboard_scheduler_reason_send_summary',
      reasonParams: { attempted: 1, success: 1, skipped: 0 }
    });
    const response = await handleDashboardStats(new Request('https://example.test/api/dashboard/stats', { headers: { 'X-Locale': 'en' } }), env, { TIMEZONE: 'Asia/Kuala_Lumpur' });
    const { data } = await response.json();
    const history = data.schedulerStatusHistory.find(entry => entry.startedAt === startedAt);
    expect(history.lastRunAt).toBe(startedAt);
    expect(history.sent).toBe(true);
    expect(history.reasonParams.success).toBe(1);
    expect(data.schedulerStatus.reasonKey).toBe('dashboard_scheduler_reason_send_summary');
  });
});
