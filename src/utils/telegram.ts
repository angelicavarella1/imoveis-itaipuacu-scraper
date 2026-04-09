import 'dotenv/config';
import { logger } from './logger';
import type { ScraperStats } from '../types';

export async function notifyTelegram(stats: ScraperStats): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    logger.warn('Credenciais do Telegram não configuradas');
    return;
  }

  const emoji = stats.errors > 0 ? '⚠️' : '✅';
  const duration = stats.duration ? ` | ⏱️ ${stats.duration}s` : '';
  
  const message = `${emoji} *Scraper Itaipuaçu Concluído*\n\n` +
    `📦 Total: \`${stats.total}\`\n` +
    `💾 Inseridos: \`${stats.inserted}\`\n` +
    `🔁 Ignorados: \`${stats.skipped}\`\n` +
    `❌ Erros: \`${stats.errors}\`${duration}\n\n` +
    `🕒 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, 'Falha no Telegram');
    } else {
      logger.info('Notificação Telegram enviada');
    }
  } catch (error) {
    logger.error(error, 'Erro de rede no Telegram');
  }
}



