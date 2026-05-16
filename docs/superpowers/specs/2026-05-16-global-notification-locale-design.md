# Global Notification Locale for Background and Outbound Messages Design

Date: 2026-05-16
Status: Draft for review
Scope: Persisted global locale for background-triggered and outbound notification content

## Goal

Add one persisted global notification-language setting so outbound notifications and background-triggered reminder content can be localized consistently even when no browser is involved.

This phase covers:
- scheduled reminder content
- test-notification outbound content
- email notification content
- Discord notification content
- shared outbound notification wording used by other notifier channels where appropriate

Supported notification locales:
- `zh`
- `en`

Default for existing/unspecified configurations:
- `en`

## Problem Statement

The app now has a solid browser-locale foundation for:
- page text
- browser-triggered dynamic UI messages
- browser-triggered API `message` responses

But background and outbound notifications still have a different problem:
- they may be triggered by cron/jobs rather than a browser session
- they may be delivered to email, Discord, Bark, Telegram, Webhook, etc.
- browser locale is unavailable or irrelevant in those flows

If we try to localize them using browser language, the result will be inconsistent and unreliable. These messages need a persisted source of truth.

## Design Principles

1. **Separate browser locale from outbound notification locale**
   - Browser-triggered UI continues using browser locale.
   - Background/outbound notification content uses a persisted configuration value.

2. **Keep the configuration model simple**
   - Use one global notification locale, not per-channel or per-subscription locale.
   - Avoid over-configuring a single-admin/single-instance product.

3. **Use a clear default**
   - Default `NOTIFICATION_LOCALE` to `en`.
   - Existing instances that have no stored value should adopt that default deterministically.

4. **Split response messages from outbound content**
   - Browser-visible API `message` values remain part of the browser-triggered localisation path.
   - The actual message content sent out by notifiers should use the notification locale.

## Recommended Approach

Introduce a persisted config field:

```txt
NOTIFICATION_LOCALE = zh | en
```

Rules:
- browser pages and browser-triggered UI still use browser locale
- cron reminders and outbound notification bodies use `NOTIFICATION_LOCALE`
- test-notification API response messages still use browser locale
- test-notification *sent content* uses `NOTIFICATION_LOCALE`

This gives consistent, predictable behavior:
- what the user sees in the page follows their browser
- what the system sends out follows the configured notification language

## Architecture

### 1. Persisted config field

Add `NOTIFICATION_LOCALE` to config storage.

Expected behavior:
- default to `en` when missing
- allow only `zh` or `en`
- normalize invalid values back to `en`

This field belongs in the same config model as `TIMEZONE`, notifier enablement, and other notification-related settings.

### 2. Shared outbound locale utilities

Create or extend a notification-focused locale helper for outbound content.

Suggested responsibilities:
- `normalizeNotificationLocale(rawLocale)`
- `getNotificationLocale(config)`
- `getNotificationMessage(key, locale, params?)`

This message catalog should be separate from browser UI messages and separate from browser-triggered API response messages.

Why separate catalogs?
- UI strings, API `message` strings, and outbound message bodies have different tone/shape needs.
- Notification copy often includes richer titles, timestamps, status lines, and channel-specific formatting.

### 3. Outbound notification message catalog

Add a notification-content dictionary with zh/en variants for the main recurring content.

First-wave examples:
- reminder titles
- reminder status text
- “today due” / “expired” / “due in X days” phrases
- reminder strategy text
- auto-renew yes/no labels
- sent-at / timezone footer text
- test-notification outbound title/content text
- email footer boilerplate
- Discord embed footer/title boilerplate where applicable

Parameterized templates are expected here.

Example shape:

```js
NOTIFICATION_MESSAGES = {
  zh: {
    reminder_due_today: '今天到期！',
    reminder_due_in_days: '将在 {days} 天后到期',
    reminder_expired_days: '已过期 {days} 天'
  },
  en: {
    reminder_due_today: 'Due today!',
    reminder_due_in_days: 'Due in {days} day(s)',
    reminder_expired_days: 'Expired {days} day(s) ago'
  }
}
```

### 4. Config-page integration

Expose one select field in `src/views/configPage.html` for notification language.

Options:
- `zh` -> 中文
- `en` -> English

The config page itself can still render those option labels using browser locale, but the stored value should remain raw `zh` / `en`.

This field should live near other notification-related settings, not under browser display settings.

### 5. Split behavior for test notification flows

This is the most important behavior boundary in the whole design.

#### Browser-visible result
When the user clicks “test notification” in the browser:
- API success/failure response `message` should continue using browser locale

#### Actual outbound content sent to the channel
The notification body/title that gets delivered to Telegram/Discord/email/etc. should use:
- `NOTIFICATION_LOCALE`

This keeps test notifications representative of real background sends while still giving browser users a localized UI response.

### 6. First-wave implementation targets

Apply `NOTIFICATION_LOCALE` to these outbound paths first:
- `src/services/notify/reminder.js`
- `src/api/handlers/test-notification.js` (outbound content only, not browser-visible result message)
- `src/api/handlers/subscriptions.js` manual test-notification content
- `src/services/notify/email.js`
- `src/services/notify/discord.js`

Then review the other notifier implementations to see whether they need channel-specific text templates or simply pass through already-localized shared content.

## Testing Strategy

### Unit tests
Add coverage for:
- `normalizeNotificationLocale()`
- defaulting missing config to `en`
- notification message lookup in zh and en
- template interpolation for outbound content

### Config tests
Add coverage verifying:
- `NOTIFICATION_LOCALE` is present in config defaults
- config update/get flows persist and return the field correctly
- invalid values normalize safely

### Outbound content tests
Add or extend tests verifying:
- reminder content changes with `NOTIFICATION_LOCALE`
- test-notification outbound content uses `NOTIFICATION_LOCALE`
- email/Discord content uses `NOTIFICATION_LOCALE`
- browser-visible API result messages remain browser-locale based where intended

## Scope

### In scope
- persisted global notification locale
- reminder/outbound message content localization
- config UI for notification-language setting
- split behavior between browser-visible response and outbound notification content

### Out of scope
- per-user language preference
- per-channel language preference
- per-subscription language preference
- locale selection based on recipient identity

## Risks and Mitigations

### Risk: confusing two locale systems
Users or future developers may confuse browser locale with notification locale.

**Mitigation:** keep the rule explicit everywhere:
- browser UI -> browser locale
- outbound content -> `NOTIFICATION_LOCALE`

### Risk: over-coupling channels to one giant catalog
Different channels may need different formatting styles.

**Mitigation:** keep a shared notification catalog, but allow channel-specific composition where necessary.

### Risk: breaking existing installations
If the new field is required or defaults wrong, old deployments could change behavior unexpectedly.

**Mitigation:** default missing `NOTIFICATION_LOCALE` to `en`.

## Rollout Plan

### Phase 1
- add `NOTIFICATION_LOCALE` config field and normalization
- add shared outbound notification locale helpers/catalog

### Phase 2
- localize reminder/test-notification/email/Discord outbound content

### Phase 3
- expand remaining notifier channels if they still contain hardcoded Chinese content

## Decision Summary

Chosen strategy:
- add one persisted global `NOTIFICATION_LOCALE`
- default it to `en`
- keep browser UI on browser locale
- use `NOTIFICATION_LOCALE` for all outbound/background notification content
- keep browser-visible test-notification result messages separate from outbound notification body localization

## User Preference

Do not commit this design document automatically. Leave it uncommitted for manual user review and commit.
