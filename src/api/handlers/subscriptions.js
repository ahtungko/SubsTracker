import {
  getAllSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  manualRenewSubscription,
  deletePaymentRecord,
  updatePaymentRecord,
  toggleSubscriptionStatus
} from '../../data/subscriptions.js';
import { getConfig } from '../../data/config.js';
import { sendNotificationToAllChannels } from '../../services/notify/index.js';
import { getNotificationLocale, getNotificationMessage } from '../../services/notify/locale.js';
import { lunarCalendar } from '../../core/lunar.js';
import { formatTimeInTimezone, formatTimezoneDisplay } from '../../core/time.js';
import { localizeCategoryValue, localizeCustomTypeValue } from '../../core/subscriptionTaxonomy.js';
import { extractTagsFromSubscriptions } from '../utils.js';
import { extractRequestLocale, getServerMessage } from '../locale.js';

function formatLocalizedServerMessage(key, locale, replacements = {}) {
  let message = getServerMessage(key, locale);
  for (const [name, value] of Object.entries(replacements)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}

function getManualTestCopy(notificationLocale) {
  const isZh = notificationLocale === 'zh';

  return {
    titlePrefix: isZh ? '手动测试通知' : 'Manual test notification',
    detailsTitle: isZh ? '订阅详情' : 'Subscription details',
    typeLabel: isZh ? '类型' : 'Type',
    categoryLabel: isZh ? '分类' : 'Category',
    amountLabel: isZh ? '金额' : 'Amount',
    billingCycleLabel: isZh ? '周期' : 'cycle',
    calendarTypeLabel: isZh ? '日历类型' : 'Calendar type',
    expiryDateLabel: isZh ? '到期日期' : 'Expiry date',
    lunarLabel: isZh ? '农历' : 'Lunar',
    autoRenewLabel: isZh ? '自动续期' : 'Auto renew',
    notesLabel: isZh ? '备注' : 'Notes',
    sentAtLabel: getNotificationMessage('reminder_sent_at', notificationLocale),
    timezoneLabel: getNotificationMessage('reminder_current_timezone', notificationLocale),
    uncategorized: isZh ? '未分类' : 'Uncategorized',
    none: isZh ? '无' : 'None',
    otherType: isZh ? '其他' : 'Other'
  };
}

async function testSingleSubscriptionNotification(id, env, locale) {
  try {
    const subscription = await getSubscription(id, env);
    if (!subscription) {
      return { success: false, message: getServerMessage('subscription_not_found', locale) };
    }
    const config = await getConfig(env);
    const notificationLocale = getNotificationLocale(config);
    const copy = getManualTestCopy(notificationLocale);

    const title = `${copy.titlePrefix}: ${subscription.name}`;

    const showLunar = config.SHOW_LUNAR === true;
    let lunarExpiryText = '';

    if (showLunar) {
      const expiryDateObj = new Date(subscription.expiryDate);
      const lunarExpiry = lunarCalendar.solar2lunar(expiryDateObj.getFullYear(), expiryDateObj.getMonth() + 1, expiryDateObj.getDate());
      lunarExpiryText = lunarExpiry ? ` (${copy.lunarLabel}: ${lunarExpiry.fullStr})` : '';
    }

    const timezone = config?.TIMEZONE || 'UTC';
    const formattedExpiryDate = formatTimeInTimezone(new Date(subscription.expiryDate), timezone, 'date');
    const currentTime = formatTimeInTimezone(new Date(), timezone, 'datetime');

    const calendarType = subscription.useLunar
      ? getNotificationMessage('reminder_calendar_lunar', notificationLocale)
      : getNotificationMessage('reminder_calendar_solar', notificationLocale);
    const autoRenewText = subscription.autoRenew
      ? getNotificationMessage('reminder_auto_renew_yes', notificationLocale)
      : getNotificationMessage('reminder_auto_renew_no', notificationLocale);
    const currencySymbols = {
      MYR: 'RM', CNY: '¥', USD: '$', HKD: 'HK$', TWD: 'NT$',
      JPY: '¥', EUR: '€', GBP: '£', KRW: '₩', TRY: '₺', KGS: 'сом'
    };
    const amountConfigured = subscription.amount !== null && subscription.amount !== undefined && !Number.isNaN(Number(subscription.amount));
    const amountCurrency = currencySymbols[subscription.currency || 'MYR'] || 'RM';
    const amountText = amountConfigured ? `\n${copy.amountLabel}: ${amountCurrency}${Number(subscription.amount).toFixed(2)}/${copy.billingCycleLabel}` : '';

    const categoryText = subscription.category ? localizeCategoryValue(subscription.category, notificationLocale) : copy.uncategorized;

    const commonContent = `**${copy.detailsTitle}**
${copy.typeLabel}: ${localizeCustomTypeValue(subscription.customType, notificationLocale) || copy.otherType}${amountText}
${copy.categoryLabel}: ${categoryText}
${copy.calendarTypeLabel}: ${calendarType}
${copy.expiryDateLabel}: ${formattedExpiryDate}${lunarExpiryText}
${copy.autoRenewLabel}: ${autoRenewText}
${copy.notesLabel}: ${subscription.notes || copy.none}
${copy.sentAtLabel}: ${currentTime}
${copy.timezoneLabel}: ${formatTimezoneDisplay(timezone)}`;

    const tags = extractTagsFromSubscriptions([subscription]);
    const notifyResult = await sendNotificationToAllChannels(title, commonContent, config, '[手动测试]', {
      metadata: { tags }
    });

    const attempted = notifyResult?.attempted || 0;
    const successCount = notifyResult?.successCount || 0;
    const failedCount = notifyResult?.failedCount || 0;

    if (attempted === 0) {
      return { success: false, message: getServerMessage('subscription_test_no_channels', locale) };
    }

    if (successCount === 0) {
      return { success: false, message: formatLocalizedServerMessage('subscription_test_failed_attempted', locale, { attempted }) };
    }

    if (failedCount > 0) {
      return { success: true, message: formatLocalizedServerMessage('subscription_test_partial_success', locale, { successCount, failedCount }) };
    }

    return { success: true, message: formatLocalizedServerMessage('subscription_test_full_success', locale, { successCount }) };
  } catch (error) {
    console.error('[手动测试] 发送失败:', error);
    return { success: false, message: getServerMessage('subscription_test_send_error_prefix', locale) + error.message };
  }
}

async function handleSubscriptions(request, env, path) {
  const method = request.method;
  const locale = extractRequestLocale(request);

  if (path === '/subscriptions') {
    if (method === 'GET') {
      const subscriptions = await getAllSubscriptions(env);
      return new Response(JSON.stringify(subscriptions), { headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'POST') {
      const subscription = await request.json();
      const result = await createSubscription(subscription, env);
      return new Response(JSON.stringify(result), {
        status: result.success ? 201 : 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (path.startsWith('/subscriptions/')) {
    const parts = path.split('/');
    const id = parts[2];

    if (parts[3] === 'toggle-status' && method === 'POST') {
      const body = await request.json();
      const result = await toggleSubscriptionStatus(id, body.isActive, env);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (parts[3] === 'test-notify' && method === 'POST') {
      const result = await testSingleSubscriptionNotification(id, env, locale);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (parts[3] === 'renew' && method === 'POST') {
      let options = {};
      try {
        const body = await request.json();
        options = body || {};
      } catch (e) {
        // empty
      }
      const result = await manualRenewSubscription(id, env, options);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (parts[3] === 'payments' && method === 'GET') {
      const subscription = await getSubscription(id, env);
      if (!subscription) {
        return new Response(JSON.stringify({ success: false, message: getServerMessage('subscription_not_found', locale) }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, payments: subscription.paymentHistory || [] }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (parts[3] === 'payments' && parts[4] && method === 'DELETE') {
      const paymentId = parts[4];
      const result = await deletePaymentRecord(id, paymentId, env);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (parts[3] === 'payments' && parts[4] && method === 'PUT') {
      const paymentId = parts[4];
      const paymentData = await request.json();
      const result = await updatePaymentRecord(id, paymentId, paymentData, env);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'GET') {
      const subscription = await getSubscription(id, env);
      return new Response(JSON.stringify(subscription), { headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'PUT') {
      const subscription = await request.json();
      const result = await updateSubscription(id, subscription, env);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'DELETE') {
      const result = await deleteSubscription(id, env);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return null;
}

export { handleSubscriptions };
