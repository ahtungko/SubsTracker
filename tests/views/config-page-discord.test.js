import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(repoRoot, 'src/views/configPage.html'), 'utf8');

test('config page exposes the Discord notifier option and config section', () => {
  assert.match(html, /value="discord"/);
  assert.match(html, /id="discordConfig"/);
  assert.match(html, /id="discordBotToken"/);
  assert.match(html, /id="discordUserId"/);
  assert.match(html, /id="testDiscordBtn"/);
});

test('config page treats the Discord bot token as a masked secret field', () => {
  assert.match(html, /id="clearDiscordBotToken"/);
  assert.match(html, /id="DISCORD_BOT_TOKENStatus"/);
  assert.match(html, /document\.getElementById\('discordBotToken'\)\.value = ''/);
  assert.match(html, /DISCORD_BOT_TOKEN: config\.DISCORD_BOT_TOKEN_CONFIGURED === true/);
  assert.match(html, /setSecretStatus\('DISCORD_BOT_TOKEN', cfg\.DISCORD_BOT_TOKEN \? window\.AppLocale\.getMessage\('config_secret_configured', window\.AppLocale\.getPreferredLocale\(\)\) : window\.AppLocale\.getMessage\('config_secret_not_configured', window\.AppLocale\.getPreferredLocale\(\)\)\)/);
  assert.match(html, /wireSecretInput\('discordBotToken', 'DISCORD_BOT_TOKEN'\)/);
  assert.match(html, /wireClearSecretButton\('clearDiscordBotToken', 'discordBotToken', 'DISCORD_BOT_TOKEN'\)/);
});

test('config page wires Discord save, toggle, and test-notification flows', () => {
  assert.match(html, /document\.getElementById\('discordUserId'\)\.value = config\.DISCORD_USER_ID \|\| ''/);
  assert.match(html, /DISCORD_BOT_TOKEN: document\.getElementById\('discordBotToken'\)\.value\.trim\(\)/);
  assert.match(html, /DISCORD_USER_ID: document\.getElementById\('discordUserId'\)\.value\.trim\(\)/);
  assert.match(html, /const discordConfig = document\.getElementById\('discordConfig'\)/);
  assert.match(html, /\[telegramConfig, notifyxConfig, webhookConfig, wechatbotConfig, emailConfig, barkConfig, gotifyConfig, serverchanConfig, pushplusConfig, discordConfig\]\.forEach/);
  assert.match(html, /} else if \(type === 'discord'\) {\s*discordConfig\.classList\.remove\('inactive'\);\s*discordConfig\.classList\.add\('active'\);/);
  assert.match(html, /testDiscordBtn/);
  assert.match(html, /Discord 私信/);
  assert.match(html, /testNotification\('discord'\)/);
});
