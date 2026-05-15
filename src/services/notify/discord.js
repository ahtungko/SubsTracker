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
    const description = String(content || '').replace(/(\*\*|`|#+\s)/g, '');

    const messageResponse = await fetch(`${apiBase}/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [
          {
            title: `\u{1F514} ${title}`,
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
