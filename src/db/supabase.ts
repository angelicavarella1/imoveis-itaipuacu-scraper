import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { logger } from '../utils/logger.js';
import type { PropertyListing } from '../types.js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios');
    client = createClient(url, key);
  }
  return client;
}

export async function upsertListings(listings: PropertyListing[]): Promise<{ inserted: number; skipped: number }> {
  if (listings.length === 0) return { inserted: 0, skipped: 0 };

  const supabase = getSupabaseClient();
  
  const dbPayload = listings.map(l => ({
    external_id: Buffer.from(l.url).toString('base64url'),
    title: l.title,
    price: l.price,
    location: l.location,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    area: l.area,
    url: l.url,
    image_urls: l.imageUrls,
    posted_date: l.postedDate?.toISOString().split('T')[0] ?? null,
    source: l.source,
    scraped_at: l.scrapedAt.toISOString()
  }));

  // Upsert sem count no select (API correta)
  const { error } = await supabase
    .from('listings')
    .upsert(dbPayload, { onConflict: 'url', ignoreDuplicates: true });

  if (error) {
    logger.error({ code: error.code, message: error.message }, 'Falha no upsert Supabase');
    throw error;
  }

  // Conta separadamente se precisar do número exato
  const { count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  const inserted = listings.length; // Assume sucesso se não houve erro
  const skipped = 0;
  
  logger.info({ inserted, total: listings.length }, 'Sync com Supabase');
  return { inserted, skipped };
}

