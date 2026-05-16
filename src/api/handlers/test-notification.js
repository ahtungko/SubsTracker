import { getConfig } from '../../data/config.js';
import { formatTimeInTimezone } from '../../core/time.js';
import { sendTelegramNotification } from '../../services/notify/telegram.js';
import { sendNotifyXNotification } from '../../services/notify/notifyx.js';
import { sendWebhookNotification } from '../../services/notify/webhook.js';
import { sendWechatBotNotification } from '../../services/notify/wechat.js';
import { sendEmailNotification } from '../../services/notify/email.js';
import { sendBarkNotification } from '../../services/notify/bark.js';
import { sendGotifyNotification } from '../../services/notify/gotify.js';
import { sendServerChanNotification } from '../../services/notify/serverchan.js';
import { sendPushPlusNotification } from '../../services/notify/pushplus.js';
import { sendDiscordNotification } from '../../services/notify/discord.js';
import { getNotificationLocale, getNotificationMessage } from '../../services/notify/locale.js';
import { extractRequestLocale, getServerMessage } from '../locale.js';

function getTestNotificationResultMessage(type, locale, success) {
  const service = getServerMessage(`test_notification_service_${type}`, locale);
  return getServerMessage(
    success ? 'test_notification_success_template' : 'test_notification_failure_template',
    locale,
    { service }
  );
}

function getNotificationServiceLabel(type, notificationLocale) {
  if (type === 'discord') {
    return getNotificationMessage('notification_service_discord', notificationLocale);
  }
  if (type === 'email') {
    return getNotificationMessage('notification_service_email', notificationLocale);
  }

  const serviceLabels = {
    zh: {
      telegram: 'Telegram通知功能',
      notifyx: 'NotifyX通知功能',
      webhook: 'Webhook 通知功能',
      wechatbot: '企业微信机器人功能',
      bark: 'Bark通知功能',
      gotify: 'Gotify通知功能',
      serverchan: 'Server酱通知功能',
      pushplus: 'PushPlus通知功能'
    },
    en: {
      telegram: 'Telegram notifications',
      notifyx: 'NotifyX notifications',
      webhook: 'webhook notifications',
      wechatbot: 'WeCom bot notifications',
      bark: 'Bark notifications',
      gotify: 'Gotify notifications',
      serverchan: 'ServerChan notifications',
      pushplus: 'PushPlus notifications'
    }
  };

  return serviceLabels[notificationLocale]?.[type] || type;
}

function buildLocalizedTestNotification(type, notificationLocale, sentAt) {
  const title = getNotificationMessage('notification_test_title', notificationLocale);
  const service = getNotificationServiceLabel(type, notificationLocale);
  const body = getNotificationMessage('notification_test_body_generic', notificationLocale, { service });
  const sentAtLabel = getNotificationMessage('reminder_sent_at', notificationLocale);

  return {
    title,
    service,
    body,
    sentAtLabel,
    plainContent: `${body}\n\n${sentAtLabel}: ${sentAt}`
  };
}

async function handleTestNotification(request, env) {
  const locale = extractRequestLocale(request);

  try {
    const config = await getConfig(env);
    const notificationLocale = getNotificationLocale(config);
    const body = await request.json();
    let success = false;
    let message = '';

    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const sentAt = formatTimeInTimezone(new Date(), config?.TIMEZONE || 'UTC', 'datetime');
    const supportedTypes = ['telegram', 'notifyx', 'webhook', 'wechatbot', 'email', 'bark', 'gotify', 'serverchan', 'pushplus', 'discord'];

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, message: getServerMessage('test_notification_missing_type', locale) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!supportedTypes.includes(type)) {
      return new Response(
        JSON.stringify({ success: false, message: getServerMessage('test_notification_unsupported_type_prefix', locale) + type }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const notificationCopy = buildLocalizedTestNotification(type, notificationLocale, sentAt);

    if (type === 'telegram') {
      const testConfig = {
        ...config,
        TG_BOT_TOKEN: typeof body.TG_BOT_TOKEN === 'string' && body.TG_BOT_TOKEN.trim().length > 0 ? body.TG_BOT_TOKEN.trim() : config.TG_BOT_TOKEN,
        TG_CHAT_ID: typeof body.TG_CHAT_ID === 'string' && body.TG_CHAT_ID.trim().length > 0 ? body.TG_CHAT_ID.trim() : config.TG_CHAT_ID
      };

      const content = `*${notificationCopy.title}*\n\n${notificationCopy.body}\n\n${notificationCopy.sentAtLabel}: ${sentAt}`;
      success = await sendTelegramNotification(content, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'notifyx') {
      const testConfig = {
        ...config,
        NOTIFYX_API_KEY: (typeof body.NOTIFYX_API_KEY === 'string' && body.NOTIFYX_API_KEY.trim().length > 0)
          ? body.NOTIFYX_API_KEY.trim()
          : config.NOTIFYX_API_KEY
      };

      const title = notificationCopy.title;
      const content = `## ${notificationCopy.title}\n\n${notificationCopy.body}\n\n${notificationCopy.sentAtLabel}: ${sentAt}`;
      const description = notificationCopy.service;

      success = await sendNotifyXNotification(title, content, description, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'webhook') {
      const testConfig = {
        ...config,
        WEBHOOK_URL: (typeof body.WEBHOOK_URL === 'string' && body.WEBHOOK_URL.trim().length > 0)
          ? body.WEBHOOK_URL.trim()
          : config.WEBHOOK_URL,
        WEBHOOK_METHOD: body.WEBHOOK_METHOD || config.WEBHOOK_METHOD,
        WEBHOOK_HEADERS: (typeof body.WEBHOOK_HEADERS === 'string' && body.WEBHOOK_HEADERS.trim().length > 0)
          ? body.WEBHOOK_HEADERS.trim()
          : config.WEBHOOK_HEADERS,
        WEBHOOK_TEMPLATE: body.WEBHOOK_TEMPLATE || config.WEBHOOK_TEMPLATE
      };

      success = await sendWebhookNotification(notificationCopy.title, notificationCopy.plainContent, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'wechatbot') {
      const testConfig = {
        ...config,
        WECHATBOT_WEBHOOK: (typeof body.WECHATBOT_WEBHOOK === 'string' && body.WECHATBOT_WEBHOOK.trim().length > 0)
          ? body.WECHATBOT_WEBHOOK.trim()
          : config.WECHATBOT_WEBHOOK,
        WECHATBOT_MSG_TYPE: body.WECHATBOT_MSG_TYPE || config.WECHATBOT_MSG_TYPE,
        WECHATBOT_AT_MOBILES: body.WECHATBOT_AT_MOBILES || config.WECHATBOT_AT_MOBILES,
        WECHATBOT_AT_ALL: body.WECHATBOT_AT_ALL || config.WECHATBOT_AT_ALL
      };

      success = await sendWechatBotNotification(notificationCopy.title, notificationCopy.plainContent, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'email') {
      const testConfig = {
        ...config,
        RESEND_API_KEY: (typeof body.RESEND_API_KEY === 'string' && body.RESEND_API_KEY.trim().length > 0)
          ? body.RESEND_API_KEY.trim()
          : config.RESEND_API_KEY,
        EMAIL_FROM: body.EMAIL_FROM || config.EMAIL_FROM,
        EMAIL_FROM_NAME: body.EMAIL_FROM_NAME || config.EMAIL_FROM_NAME,
        EMAIL_TO: body.EMAIL_TO || config.EMAIL_TO
      };

      success = await sendEmailNotification(notificationCopy.title, notificationCopy.plainContent, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'bark') {
      const testConfig = {
        ...config,
        BARK_SERVER: body.BARK_SERVER || config.BARK_SERVER,
        BARK_DEVICE_KEY: (typeof body.BARK_DEVICE_KEY === 'string' && body.BARK_DEVICE_KEY.trim().length > 0)
          ? body.BARK_DEVICE_KEY.trim()
          : config.BARK_DEVICE_KEY,
        BARK_IS_ARCHIVE: body.BARK_IS_ARCHIVE || config.BARK_IS_ARCHIVE
      };

      success = await sendBarkNotification(notificationCopy.title, notificationCopy.plainContent, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'gotify') {
      const testConfig = {
        ...config,
        GOTIFY_SERVER_URL: body.GOTIFY_SERVER_URL || config.GOTIFY_SERVER_URL,
        GOTIFY_APP_TOKEN: (typeof body.GOTIFY_APP_TOKEN === 'string' && body.GOTIFY_APP_TOKEN.trim().length > 0)
          ? body.GOTIFY_APP_TOKEN.trim()
          : config.GOTIFY_APP_TOKEN
      };

      success = await sendGotifyNotification(notificationCopy.title, notificationCopy.plainContent, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'serverchan') {
      const testConfig = {
        ...config,
        SERVERCHAN_SENDKEY: (typeof body.SERVERCHAN_SENDKEY === 'string' && body.SERVERCHAN_SENDKEY.trim().length > 0)
          ? body.SERVERCHAN_SENDKEY.trim()
          : config.SERVERCHAN_SENDKEY
      };

      success = await sendServerChanNotification(notificationCopy.title, notificationCopy.plainContent, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'pushplus') {
      const testConfig = {
        ...config,
        PUSHPLUS_TOKEN: (typeof body.PUSHPLUS_TOKEN === 'string' && body.PUSHPLUS_TOKEN.trim().length > 0)
          ? body.PUSHPLUS_TOKEN.trim()
          : config.PUSHPLUS_TOKEN,
        PUSHPLUS_TOPIC: body.PUSHPLUS_TOPIC || config.PUSHPLUS_TOPIC,
        PUSHPLUS_CHANNEL: body.PUSHPLUS_CHANNEL || config.PUSHPLUS_CHANNEL
      };

      success = await sendPushPlusNotification(notificationCopy.title, notificationCopy.plainContent, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    } else if (type === 'discord') {
      const testConfig = {
        ...config,
        DISCORD_BOT_TOKEN: (typeof body.DISCORD_BOT_TOKEN === 'string' && body.DISCORD_BOT_TOKEN.trim().length > 0)
          ? body.DISCORD_BOT_TOKEN.trim()
          : config.DISCORD_BOT_TOKEN,
        DISCORD_USER_ID: (typeof body.DISCORD_USER_ID === 'string' && body.DISCORD_USER_ID.trim().length > 0)
          ? body.DISCORD_USER_ID.trim()
          : config.DISCORD_USER_ID
      };

      success = await sendDiscordNotification(`${notificationCopy.service} - ${notificationCopy.title}`, notificationCopy.plainContent, testConfig);
      message = getTestNotificationResultMessage(type, locale, success);
    }

    return new Response(
      JSON.stringify({ success, message }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('测试通知失败:', error);
    return new Response(
      JSON.stringify({ success: false, message: getServerMessage('test_notification_failed_prefix', locale) + error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export { handleTestNotification };
