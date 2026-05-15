import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_TIMEZONE_IDS,
  TIMEZONE_LABELS,
  normalizeUiLocale,
  getTimezoneDisplayName
} from '../core/locale.js';

function buildBrowserLocaleResources() {
  return `<script>
  (function() {
    const DEFAULT_UI_LOCALE = ${JSON.stringify(DEFAULT_UI_LOCALE)};
    const SUPPORTED_TIMEZONE_IDS = ${JSON.stringify(SUPPORTED_TIMEZONE_IDS)};
    const TIMEZONE_LABELS = ${JSON.stringify(TIMEZONE_LABELS)};
    const normalizeUiLocale = ${normalizeUiLocale.toString()};
    const getTimezoneDisplayName = ${getTimezoneDisplayName.toString()};

    function getPreferredLocale() {
      const preferredLocale = Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages[0]
        : navigator.language;

      return normalizeUiLocale(preferredLocale || DEFAULT_UI_LOCALE);
    }

    function getTimezoneOffset(timezone) {
      const now = new Date();
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const parts = dtf.formatToParts(now);
      const get = type => Number(parts.find(x => x.type === type).value);
      const zonedTimestamp = Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour'),
        get('minute'),
        get('second')
      );

      return Math.round((zonedTimestamp - now.getTime()) / (1000 * 60));
    }

    function formatUtcOffset(totalMinutes) {
      const sign = totalMinutes >= 0 ? '+' : '-';
      const absoluteMinutes = Math.abs(totalMinutes);
      const hours = Math.floor(absoluteMinutes / 60);
      const minutes = absoluteMinutes % 60;

      if (minutes === 0) {
        return sign + hours;
      }

      return sign + hours + ':' + String(minutes).padStart(2, '0');
    }

    function formatTimezoneDisplay(timezone, locale) {
      try {
        const resolvedLocale = normalizeUiLocale(locale || getPreferredLocale());
        const label = getTimezoneDisplayName(timezone, resolvedLocale);
        const offsetStr = formatUtcOffset(getTimezoneOffset(timezone));
        return label + ' (UTC' + offsetStr + ')';
      } catch (error) {
        console.error('formatTimezoneDisplay failed:', error);
        return timezone;
      }
    }

    window.AppLocale = Object.freeze({
      DEFAULT_UI_LOCALE,
      SUPPORTED_TIMEZONE_IDS,
      normalizeUiLocale,
      getPreferredLocale,
      getTimezoneDisplayName,
      formatTimezoneDisplay
    });
  })();
</script>`;
}

export { buildBrowserLocaleResources };
