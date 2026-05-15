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
  assert.match(dashboardPageHtml, /折合MYR/);
  assert.match(dashboardPageHtml, /月度支出 \(MYR\)/);
  assert.match(dashboardPageHtml, /年度支出 \(MYR\)/);
  assert.doesNotMatch(dashboardPageHtml, /月度支出 \(CNY\)/);
  assert.match(dashboardPageHtml, /RM\$\{data\.monthlyExpense\.amount\.toFixed\(2\)\}/);
  assert.match(dashboardPageHtml, /RM\$\{data\.yearlyExpense\.amount\.toFixed\(2\)\}/);
});
