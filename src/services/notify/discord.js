const DISCORD_EMBED_TITLE_MAX_LENGTH = 256;
const DISCORD_EMBED_DESCRIPTION_MAX_LENGTH = 4096;
const TRUNCATION_MARKER = '…';

function clampDiscordEmbedText(value, maxLength) {
  const text = String(value || '');

  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength <= TRUNCATION_MARKER.length) {
    return TRUNCATION_MARKER.slice(0, maxLength);
  }

  return `${text.slice(0, maxLength - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}`;
}

async function sendDiscordNotification(title, content, config) {
  try {
    const botToken = (config.DISCORD_BOT_TOKEN || '').trim();
    const userId = (config.DISCORD_USER_ID || '').trim();

    if (!botToken || !userId) {
      console.error('[Discord Bot] 通知未配置，缺少 Bot Token 或 User ID');
      return false;
    }

    const apiBase = 'https://discord.com/api/v10';

    const dmChannelResponse = await fetch(`${apiBase}/users/@me/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_id: userId
      })
    });

    if (!dmChannelResponse.ok) {
      const text = await dmChannelResponse.text().catch(() => '');
      console.error('[Discord Bot] 创建 DM 频道失败:', dmChannelResponse.status, text);
      return false;
    }

    const dmChannel = await dmChannelResponse.json();

    if (!dmChannel?.id) {
      console.error('[Discord Bot] \u521b\u5efa DM \u9891\u9053\u5931\u8d25: \u672a\u8fd4\u56de\u9891\u9053 ID');
      return false;
    }

    const embedTitle = clampDiscordEmbedText(`\u{1F514} ${String(title || '')}`, DISCORD_EMBED_TITLE_MAX_LENGTH);
    const description = clampDiscordEmbedText(
      String(content || '').replace(/(\*\*|`|#+\s)/g, ''),
      DISCORD_EMBED_DESCRIPTION_MAX_LENGTH
    );

    const messageResponse = await fetch(`${apiBase}/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [
          {
            title: embedTitle,
            description,
            color: 5814783,
            timestamp: new Date().toISOString(),
            footer: {
              text: '订阅管理系统'
            }
          }
        ]
      })
    });

    if (!messageResponse.ok) {
      const text = await messageResponse.text().catch(() => '');
      console.error('[Discord Bot] 发送 DM 失败:', messageResponse.status, text);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Discord Bot] 发送失败:', error);
    return false;
  }
}

export { sendDiscordNotification };
