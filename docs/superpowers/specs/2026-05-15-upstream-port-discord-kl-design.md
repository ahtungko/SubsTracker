# Upstream Port for Discord Support and Kuala Lumpur Time Design

## Goal

Rebase future work on `upstream/master` and reintroduce the two existing customizations from the old local branch without regressing upstream V2 behavior:

1. Discord direct-message notification support
2. Kuala Lumpur timezone support and display labels

## Current State

- The old local branch keeps both customizations in the legacy single-file `index.js`.
- `upstream/master` has moved to a modular V2 structure under `src/`.
- Upstream does not include Discord notifier support.
- Upstream includes timezone support helpers, but Kuala Lumpur is missing from the curated timezone lists and display-name maps.
- The upgrade work must not alter the user's current `master` branch or overwrite local custom behavior accidentally.

## Recommended Approach

Create an isolated upgrade branch from `upstream/master`, port the two customizations into the modular V2 structure, and keep the port intentionally narrow:

- do not merge the legacy monolithic `index.js`
- do not reintroduce old security behavior
- do not revert upstream secret-masking config flows
- do not fork timezone logic in multiple inconsistent places

This keeps upstream as the source of truth and layers only the missing custom features on top.

## Scope

### In scope

- Add Discord notifier implementation in V2
- Add Discord config fields to secure config storage/update flow
- Add Discord test-notification flow
- Add Discord UI controls in the config page
- Add Kuala Lumpur to shared timezone display helpers
- Add Kuala Lumpur to config/admin timezone option lists

### Out of scope

- Reworking upstream scheduling semantics
- Replacing upstream UTC-based notification-hour behavior
- Broad refactors outside Discord/timezone integration points
- Converting the repo to a new test framework unless needed for minimal regression coverage

## Architecture

### 1. Discord notifier

Port the old Discord logic into the upstream notification module layout:

- `src/services/notify/discord.js`
  - create a focused sender for Discord bot DM delivery
  - preserve the existing two-step flow:
    1. create/get DM channel via `/users/@me/channels`
    2. send embed message to `/channels/{id}/messages`

- `src/services/notify/index.js`
  - import Discord sender
  - send on `ENABLED_NOTIFIERS.includes('discord')`
  - include result logging in the same style as other notifiers

- `src/api/handlers/test-notification.js`
  - allow `type === 'discord'`
  - accept temporary request overrides for `DISCORD_BOT_TOKEN` and `DISCORD_USER_ID`
  - format test message using existing shared time helper

- `src/data/config.js`
  - add defaults for `DISCORD_BOT_TOKEN` and `DISCORD_USER_ID`

- `src/api/handlers/config.js`
  - treat `DISCORD_BOT_TOKEN` as a masked secret field
  - persist `DISCORD_USER_ID` as a normal field
  - retain upstream clear-secret semantics

- `src/views/configPage.html`
  - add Discord checkbox
  - add Discord config panel
  - wire save/test behavior
  - wire masked secret UI for the bot token

### 2. Kuala Lumpur timezone

Port this as a first-class timezone option rather than as a hardcoded replacement for Beijing time:

- keep upstream generic timezone helpers
- add `Asia/Kuala_Lumpur` to shared display-name maps
- add `Asia/Kuala_Lumpur` to curated select-option lists
- let existing `TIMEZONE` config drive behavior

Files:

- `src/core/time.js`
  - add display label for `Asia/Kuala_Lumpur`
  - optionally add a helper alias only if needed for compatibility

- `src/views/configPage.html`
  - add Kuala Lumpur to static select HTML
  - add Kuala Lumpur to generated timezone options list

- `src/views/adminPage.html`
  - add Kuala Lumpur to frontend timezone-name map used for display text

## Data Flow

### Discord

1. User enables `discord` in config UI
2. User stores `DISCORD_BOT_TOKEN` and `DISCORD_USER_ID`
3. Config API saves token securely and returns only configured flags
4. Notification dispatcher routes reminder content to Discord sender
5. Test-notification endpoint can validate saved credentials or temporary overrides

### Kuala Lumpur timezone

1. User selects `Asia/Kuala_Lumpur` in config UI
2. Config stores `TIMEZONE`
3. Existing V2 formatting and reminder text paths continue using shared timezone helpers
4. UI labels render “Kuala Lumpur time” correctly instead of falling back to raw IANA name

## Error Handling

### Discord

- Missing bot token or user ID returns `false` and logs a clear message
- DM channel creation failure returns `false` with response detail logged
- Message send failure returns `false` with response detail logged
- Config page test flow should keep upstream UX pattern: user sees success/failure toast only

### Timezone

- If an unknown timezone is present in stored config, keep upstream fallback behavior to UTC or raw timezone string
- Kuala Lumpur should be added without removing existing timezone fallback behavior

## Testing Strategy

This repo currently has no `npm test` script, so there is no existing automated baseline. Before implementation, add the smallest practical regression coverage around the new logic:

1. unit-style checks for timezone display helper behavior
2. unit-style checks for config safe-response behavior around Discord token masking
3. unit-style checks for notification dispatcher including Discord path

Networked Discord API calls should be tested with fetch stubs rather than live requests.

## Risks

1. Upstream config security flow could be weakened if Discord token is handled like a normal field
2. Config page wiring is large and easy to miss in one of several switch/handler sections
3. Timezone labels are duplicated in multiple frontend/backend maps, so incomplete porting would create inconsistent display text
4. No existing automated tests means verification must be added as part of the port

## Success Criteria

- Upgrade work lives on top of `upstream/master`
- User's current local branch remains untouched
- Discord notifier can be configured, tested, saved, and dispatched from V2
- Kuala Lumpur appears as a first-class timezone option and display label
- Upstream secret-masking behavior remains intact
- No legacy `index.js` merge is introduced
