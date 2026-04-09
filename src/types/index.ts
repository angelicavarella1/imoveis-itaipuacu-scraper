import 'dotenv/config';
import { scrapeListings } from './scraper/playwright';
import { upsertListings } from './db/supabase';
import { notifyTelegram } from './utils/telegram';
import { logger } from './utils/logger';
import type { PropertyListing } from './types/index';

async function main() {
  const start = Date.now();
  logger.info('🚀 Scraper iniciado');

  let errors = 0;
  let listings: PropertyListing[] = [];

  try {
    listings = await scrapeListings('', parseInt(process.env.MAX_PAGES || '2', 10));
  } catch (e: any) {
    errors++;
    logger.error({ error: e.message }, '❌ Erro no scraping');
  }

  logger.info({ total: listings.length }, '📦 Extração concluída');

  if (listings.length > 0) {
    try {
      const { inserted, skipped } = await upsertListings(listings);
      logger.info({ inserted, skipped }, '💾 Supabase');
    } catch (e: any) {
      errors++;
      logger.error({ error: e.message }, '❌ Erro no Supabase');
    }
  }

  const duration = Math.round((Date.now() - start) / 1000);
  await notifyTelegram({ total: listings.length, inserted: listings.length, skipped: 0, errors, duration });
  
  logger.info('✅ Pipeline finalizado', { duration: `${duration}s`, errors });
  if (errors > 0) process.exitCode = 1;
}

main().catch(e => { logger.error(e, '❌ Crítico'); process.exit(1); });
