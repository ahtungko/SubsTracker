import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const pagesJsPath = path.join(repoRoot, 'src/views/pages.js');
const runtimeJsPath = path.join(repoRoot, 'src/views/browser-locale-resources.js');
const pagesJs = fs.readFileSync(pagesJsPath, 'utf8');
const runtimeJs = fs.readFileSync(runtimeJsPath, 'utf8');
const dashboardPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/dashboardPage.html'), 'utf8');
const adminPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/adminPage.html'), 'utf8');
const configPageHtml = fs.readFileSync(path.join(repoRoot, 'src/views/configPage.html'), 'utf8');

function stripScriptTags(scriptHtml) {
  const match = scriptHtml.match(/^<script>\s*([\s\S]*)\s*<\/script>$/);
  assert.ok(match, 'expected buildBrowserLocaleResources() to return one inline <script> block');
  return match[1];
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function getFirstInlineScript(html) {
  const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'expected page HTML to contain an inline script');
  return match[1];
}

test('pages inject shared browser locale resources alongside theme resources', () => {
  assert.match(pagesJs, /buildBrowserLocaleResources/);
  assert.match(pagesJs, /const sharedResources = themeResourcesHtml \+ '\\n' \+ buildBrowserLocaleResources\(\);/);
  assert.match(pagesJs, /return html\.replace\(/);
});

test('browser locale runtime exposes AppLocale helpers and supported timezone ids', async () => {
  assert.match(runtimeJs, /window\.AppLocale/);
  assert.match(runtimeJs, /SUPPORTED_TIMEZONE_IDS/);
  assert.match(runtimeJs, /getPreferredLocale/);
  assert.match(runtimeJs, /formatTimezoneDisplay/);
  assert.match(runtimeJs, /getTimezoneDisplayName/);

  const runtimeModule = await import(pathToFileURL(runtimeJsPath).href + `?t=${Date.now()}`);
  const scriptHtml = runtimeModule.buildBrowserLocaleResources();
  const scriptSource = stripScriptTags(scriptHtml);

  new vm.Script(scriptSource, { filename: 'browser-locale-inline-runtime.js' });

  const sandbox = {
    window: {},
    navigator: { language: 'en-US', languages: ['zh-CN', 'en-US'] },
    Intl,
    Date,
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox, { filename: 'browser-locale-inline-runtime.js' });

  const { AppLocale } = sandbox.window;
  assert.ok(AppLocale, 'expected runtime to define window.AppLocale');
  assert.equal(AppLocale.DEFAULT_UI_LOCALE, 'en');
  assert.ok(Array.isArray(AppLocale.SUPPORTED_TIMEZONE_IDS));
  assert.equal(typeof AppLocale.normalizeUiLocale, 'function');
  assert.equal(typeof AppLocale.getPreferredLocale, 'function');
  assert.equal(typeof AppLocale.getTimezoneDisplayName, 'function');
  assert.equal(typeof AppLocale.formatTimezoneDisplay, 'function');
  assert.equal(AppLocale.getPreferredLocale(), 'zh');
  assert.match(AppLocale.formatTimezoneDisplay('UTC', 'en'), /^UTC \(UTC[+-]?\d+\)$/);
  assert.match(AppLocale.formatTimezoneDisplay('Asia/Singapore', 'en'), /UTC\+8(?:\b|\))/);
  assert.match(AppLocale.formatTimezoneDisplay('Asia/Kolkata', 'en'), /UTC\+5:30(?:\b|\))/);
});

test('dashboard and admin use shared timezone formatter instead of page-local copies', () => {
  assert.equal(countMatches(dashboardPageHtml, /function formatTimezoneDisplay\(/g), 0);
  assert.equal(countMatches(adminPageHtml, /function formatTimezoneDisplay\(/g), 0);
  assert.equal(dashboardPageHtml.includes('window.AppLocale.formatTimezoneDisplay(localTimezone)'), true);
  assert.equal(adminPageHtml.includes('window.AppLocale.formatTimezoneDisplay(localTimezone)'), true);
});

test('config page builds timezone labels from shared AppLocale data', () => {
  assert.equal(countMatches(configPageHtml, /function formatTimezoneDisplay\(/g), 0);
  assert.equal(configPageHtml.includes('window.AppLocale.SUPPORTED_TIMEZONE_IDS'), true);
  assert.equal(configPageHtml.includes('window.AppLocale.formatTimezoneDisplay(timezoneId)'), true);
  assert.equal(configPageHtml.includes("name: '吉隆坡时间'"), false);
  assert.equal(configPageHtml.includes('<option value="Asia/Kuala_Lumpur">吉隆坡时间'), false);
  assert.equal(countMatches(configPageHtml, /fetch\('\/api\/config'/g), 2);
});

test('dashboard, admin, and config inline scripts still compile after locale refactor', () => {
  assert.doesNotThrow(() => new Function(getFirstInlineScript(dashboardPageHtml)));
  assert.doesNotThrow(() => new Function(getFirstInlineScript(adminPageHtml)));
  assert.doesNotThrow(() => new Function(getFirstInlineScript(configPageHtml)));
});
