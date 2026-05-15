# Browser Locale Timezone Display Design

Date: 2026-05-16
Status: Draft for review
Scope: Web UI timezone display localisation for dashboard, admin, and config pages

## Goal

Make timezone labels in the web UI follow the user's browser language while keeping stored timezone values stable.

Initial target languages:
- Chinese (`zh-*`)
- English (`en-*`)
- Any other browser language falls back to English

This design only covers the web UI for now. Server-generated notification content such as reminder text, email, and Discord messages remains unchanged in this phase.

## Problem Statement

The current UI has multiple independent implementations of timezone display formatting:
- `src/views/dashboardPage.html`
- `src/views/adminPage.html`
- `src/views/configPage.html`
- `src/core/time.js` for server-side formatting

These implementations have already drifted. Some pages display raw IANA IDs like `Asia/Kuala_Lumpur`, while others display Chinese labels like `吉隆坡时间`. This duplication makes localisation fragile and guarantees future inconsistency.

## Design Principles

1. Canonical data stays canonical.
   - Store and transmit timezone values only as IANA timezone IDs such as `Asia/Kuala_Lumpur`.
   - Never store translated timezone names.

2. Display is locale-aware.
   - Human-readable timezone labels are generated at render time.
   - The same timezone can display differently depending on the browser locale.

3. English is the universal fallback.
   - `zh-*` browsers get Chinese labels.
   - `en-*` browsers get English labels.
   - All other locales fall back to English.

4. Shared logic, not per-page copies.
   - Frontend pages must call one shared formatter.
   - Future changes to display rules happen in one place.

## Recommended Approach

Create a shared browser-side locale/timezone helper that is injected into admin, dashboard, and config pages the same way shared theme resources are injected today.

At the same time, prepare matching server-side helper semantics so that future localisation work can reuse the same label model, even if server-rendered notifications are not changed in this phase.

## Architecture

### 1. Locale normalization

Introduce a locale resolver that converts browser locale input into one of two supported UI locales:
- `zh`
- `en`

Normalization rules:
- `zh`, `zh-CN`, `zh-SG`, `zh-MY`, and other `zh-*` variants map to `zh`
- `en`, `en-US`, `en-GB`, and other `en-*` variants map to `en`
- anything else maps to `en`

Preferred source order in the browser:
1. `navigator.languages[0]`
2. `navigator.language`
3. fallback to `en`

### 2. Shared timezone label registry

Define one logical label registry keyed by locale and canonical timezone ID.

Example structure:

```js
{
  zh: {
    'Asia/Kuala_Lumpur': '吉隆坡时间'
  },
  en: {
    'Asia/Kuala_Lumpur': 'Kuala Lumpur Time'
  }
}
```

The registry remains data-only. Business logic should not embed translated strings directly in page-specific formatters.

### 3. Shared formatter API

Expose one frontend formatter with behavior like:

```js
formatTimezoneDisplay(timezone, locale?)
```

Behavior:
- resolve locale if not provided
- compute UTC offset from the timezone ID
- look up translated timezone label for the resolved locale
- if locale label is missing, use English label
- if English label is missing, use the raw timezone ID
- return a final string such as:
  - `吉隆坡时间 (UTC+8)`
  - `Kuala Lumpur Time (UTC+8)`

### 4. Frontend integration

Inject a shared browser helper through the existing shared resource mechanism, rather than leaving page-local copies.

Pages in scope for phase 1:
- `src/views/dashboardPage.html`
- `src/views/adminPage.html`
- `src/views/configPage.html`

Each page should:
- stop defining its own `formatTimezoneDisplay()` implementation
- call the shared browser helper instead
- continue using the browser's current timezone for the live system-time widget

### 5. Server-side alignment

The server already has `src/core/time.js` with a `formatTimezoneDisplay()` helper. For phase 1, server-generated outputs are not being localized from browser language, because the browser locale is not reliably available in those flows.

However, the data model should be aligned now so that future phase work can reuse the same concepts:
- canonical timezone ID input
- locale-aware label lookup
- English fallback

This means future refactoring should move label data and locale normalization into a shared server-side module, such as `src/core/locale.js` or `src/core/i18n.js`, rather than keeping translated labels embedded inside `src/core/time.js`.

## Data Flow

### Web UI flow
1. Browser loads page
2. Shared frontend helper resolves preferred locale from browser settings
3. Page determines current timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`
4. Shared formatter converts timezone ID into a localized display label plus offset
5. Page updates the system-time display

### Fallback flow
1. Browser locale is not `zh-*` or `en-*`
2. Locale normalizes to `en`
3. Formatter uses English label if available
4. If label missing, formatter uses raw timezone ID

## Error Handling

- Invalid timezone ID: log the formatting error and fall back to the raw timezone string
- Missing locale input: default to `en`
- Missing translated label for target locale: fall back to English label
- Missing English label: fall back to raw timezone ID

The formatter must never throw an uncaught error into the page rendering path for the system-time widget.

## Testing Strategy

### Unit-level behavior
Add tests that verify:
- `zh-*` locale resolves to Chinese timezone labels
- `en-*` locale resolves to English timezone labels
- unsupported locales fall back to English
- missing locale argument still resolves correctly
- missing label falls back to English, then to raw timezone ID

### Page-level regression coverage
Add page-content tests that verify:
- dashboard uses the shared timezone localization path
- admin uses the shared timezone localization path
- config uses the shared timezone localization path
- no page retains its own duplicate timezone label map or duplicate formatter implementation

### Non-goals for this phase
Do not add notification localization tests yet for:
- reminder content
- email content
- Discord content

Those flows need a separate language-source decision and are intentionally deferred.

## Scope

### In scope
- Browser locale detection
- Chinese and English timezone label display
- English fallback for unsupported browser locales
- Shared frontend helper for dashboard/admin/config
- Regression tests for shared UI behavior

### Out of scope
- User-selectable language setting
- Persisted language preference
- Localisation of reminder, email, or Discord notification content
- Full application-wide i18n framework
- Languages other than Chinese and English

## Rollout Plan

### Phase 1
Implement browser-based localisation for timezone labels in web UI pages only.

### Phase 2
If notification content also needs to follow user language, introduce a persisted user language preference because browser locale is not enough for background jobs and out-of-browser delivery channels.

## Decision Summary

Chosen strategy:
- canonical timezone IDs remain the only stored value
- browser locale determines display language for the web UI
- supported display locales are `zh` and `en`
- all unsupported locales fall back to English
- dashboard, admin, and config pages will use one shared frontend formatter
- server-side notifications are deferred to a later phase
