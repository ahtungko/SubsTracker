import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatTimezoneDisplay } from '../../src/core/time.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const configPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/configPage.html'), 'utf8');
const adminPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/adminPage.html'), 'utf8');

test('formatTimezoneDisplay labels Kuala Lumpur with UTC+8', () => {
  assert.equal(formatTimezoneDisplay('Asia/Kuala_Lumpur'), '吉隆坡时间 (UTC+8)');
});

test('config page exposes Kuala Lumpur in the static timezone select', () => {
  assert.match(
    configPageHtml,
    /<option value="Asia\/Kuala_Lumpur">吉隆坡时间（UTC\+8）<\/option>/
  );
});

test('config page exposes Kuala Lumpur in the generated timezone options', () => {
  assert.match(
    configPageHtml,
    /\{ value: 'Asia\/Kuala_Lumpur', name: '吉隆坡时间', offset: '\+8' \}/
  );
});

test('admin page timezone name map includes Kuala Lumpur', () => {
  assert.match(
    adminPageHtml,
    /'Asia\/Kuala_Lumpur': '吉隆坡时间'/
  );
});
