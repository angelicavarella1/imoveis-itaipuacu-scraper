import { chromium, type Route } from 'playwright';
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { logger } from '../utils/logger';
import { getSelectors } from '../config/selectors';
import { validateAndClean } from '../utils/validators';
import { parseRelativeDate } from '../utils/dateParser';
import type { PropertyListing, RawPropertyData } from '../types';

type SourceType = 'olx' | 'zap' | 'vivareal' | 'agency';

const CONFIG = {
  HEADLESS: process.env.DEBUG_MODE === 'true',
  TIMEOUT_MS: parseInt(process.env.PAGE_TIMEOUT_MS || '60000', 10),
  WAIT_UNTIL: (process.env.PAGE_WAIT_UNTIL || 'domcontentloaded') as any,
  BASE_DELAY: 3000,
  REGION_KEYWORDS: ['itaipuacu', 'maricá', 'marica', 'rj', 'rio de janeiro'],
  DAYS_BACK: 30,
  // Portais com infinite scroll (não clicar em paginação)
  NO_PAGINATION: ['zap', 'vivareal'],
};

const RX = {
  PRICE: /R\$\s*([\d.,]+)/i,
  AREA: /(\d+(?:[.,]\d+)?)\s*m²/i,
  BED: /(\d+)\s*(?:quartos?|qto|dorm)/i,
  BATH: /(\d+)\s*(?:banheiros?|ban)/i,
};

function isValidUrl(source: SourceType, url: string, domain?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (source === 'zap') return lower.includes('zapimoveis.com.br');
  if (source === 'vivareal') return lower.includes('vivareal.com.br');
  if (source === 'agency' && domain) return lower.includes(domain);
  // Filtro flexível: aceita se tiver QUALQUER palavra-chave da região
  return CONFIG.REGION_KEYWORDS.some(k => lower.includes(k));
}

function parseText(text: string): RawPropertyData {
  const priceM = text.match(RX.PRICE);
  const areaM = text.match(RX.AREA);
  const bedM = text.match(RX.BED);
  const bathM = text.match(RX.BATH);
  
  const result: RawPropertyData = {};
  let title: string | undefined;
  const idx = text.search(new RegExp([RX.PRICE.source, RX.AREA.source].join('|'), 'i'));
  if (idx > 0 && idx < 200) {
    const t = text.substring(0, idx).trim();
    const clean = t.replace(/^(Venda|Aluguel|Exclusivo|Novo|Chat|Direto com o proprietário)\s*[-–|]?\s*/i, '').slice(0, 120);
    if (clean.length > 0) title = clean;
  }
  if (title) result.title = title;
  if (priceM) result.priceRaw = `R$ ${priceM[1]}`;
  if (areaM) result.areaRaw = areaM[1];
  if (bedM) result.bedrooms = parseInt(bedM[1], 10);
  if (bathM) result.bathrooms = parseInt(bathM[1], 10);
  return result;
}

async function acceptCookies(page: any) {
  // Tenta aceitar banners de cookie comuns
  const selectors = [
    'button:has-text("Aceitar")', 'button:has-text("Accept")', 
    '[aria-label*="aceitar"]', '[aria-label*="accept"]',
    '#onetrust-accept-btn-handler', '.cookie-accept', '#L2AGLb'
  ];
  for (const sel of selectors) {
    try {
      const btn = await page.$(sel);
      if (btn) { await btn.click().catch(() => {}); await page.waitForTimeout(500); break; }
    } catch {}
  }
}

async function scrapeSource(source: SourceType, url: string, domain?: string, maxPages = 1): Promise<PropertyListing[]> {
  const results: PropertyListing[] = [];
  let browser: any = null;
  const name = domain || source;
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - CONFIG.DAYS_BACK);

  logger.info({ source: name, url: url.split('?')[0], daysBack: CONFIG.DAYS_BACK }, `🚀 ${name}`);

  try {
    browser = await chromium.launch({
      headless: CONFIG.HEADLESS,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    });

    await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
    await context.route('**/*.{png,jpg,webp,gif,woff}', (r: Route) => r.abort());

    const page = await context.newPage();
    await page.goto(url, { waitUntil: CONFIG.WAIT_UNTIL, timeout: CONFIG.TIMEOUT_MS });
    await page.waitForTimeout(CONFIG.BASE_DELAY);
    
    // Aceita cookies se aparecer banner
    await acceptCookies(page);
    await page.waitForTimeout(1000);

    // 🐛 DEBUG: Salva HTML para análise se DEBUG_MODE=true
    if (CONFIG.HEADLESS === false) {
      const html = await page.content();
      writeFileSync(`debug-${name}.html`, html, 'utf-8');
      logger.info({ file: `debug-${name}.html` }, '💾 HTML salvo para debug');
    }

    const sel = getSelectors(source);
    try { await page.waitForSelector(sel.container.split(',')[0].trim(), { timeout: 10000 }); } catch {}

    // Conta quantos elementos os seletores encontram (para diagnóstico)
    const count = await page.evaluate((s: any) => document.querySelectorAll(s.container).length, sel);
    logger.info({ source: name, selectorMatches: count }, '🔍 Elementos encontrados');

    for (let p = 0; p < maxPages; p++) {
      const items = await page.evaluate((s: any) => {
        const nodes: any = document.querySelectorAll(s.container);
        return Array.from(nodes).map((node: any) => {
          const link = node.querySelector('a[href]');
          return {
            text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
            url: link?.href ? new URL(link.href, document.location.href).href : '',
            img: Array.from(node.querySelectorAll('img')).map((i: any) => i.src || i.dataset?.src || '').filter(Boolean),
          };
        });
      }, sel);

      logger.info({ source: name, page: p+1, count: items.length }, '📦 Extraído');

      for (const it of items) {
        if (!isValidUrl(source, it.url, domain)) continue;
        
        const parsed = parseText(it.text);
        const postedDate = parsed.postedDateRaw ? parseRelativeDate(parsed.postedDateRaw) : null;
        if (postedDate && postedDate < thirtyDaysAgo) continue;

        const raw: RawPropertyData = { ...parsed };
        if (it.url) raw.url = it.url;
        if (it.img.length > 0) raw.imageUrls = it.img.slice(0, 5);
        if (postedDate) raw.postedDate = postedDate;
        // Filtro flexível de localização
        const textLower = (parsed.title + ' ' + it.text).toLowerCase();
        if (CONFIG.REGION_KEYWORDS.some(k => textLower.includes(k))) raw.location = 'Maricá/RJ';
        raw.source = name;

        const v = validateAndClean(raw);
        if (v) { results.push(v); logger.debug({ source: name, title: v.title.slice(0,40), price: v.price }, '✅'); }
      }

      // Paginação: só clica se NÃO estiver na lista NO_PAGINATION
      if (p < maxPages - 1 && !CONFIG.NO_PAGINATION.includes(source)) {
        const next = await page.$(sel.next);
        if (!next) break;
        try {
          await Promise.all([
            page.waitForNavigation({ waitUntil: CONFIG.WAIT_UNTIL, timeout: CONFIG.TIMEOUT_MS }).catch(() => {}),
            next.click(),
          ]);
          await page.waitForTimeout(CONFIG.BASE_DELAY + Math.random() * 2000);
        } catch { break; }
      } else if (p < maxPages - 1) {
        logger.debug({ source: name }, '⏭️ Paginação desativada para esta fonte');
        break;
      }
    }
    await context.close();
    logger.info({ source: name, total: results.length }, '🎯 Fim');

  } catch (e: any) {
    logger.error({ source: name, name: e.name, message: e.message }, '❌ Erro');
  } finally {
    if (browser) await browser.close();
  }
  return results;
}

export async function scrapeListings(_: string = '', maxPages = 1): Promise<PropertyListing[]> {
  const all: PropertyListing[] = [];
  const sources = (process.env.ACTIVE_SOURCE || 'olx').split(',').map(s => s.trim() as SourceType);
  const urls: Record<SourceType, string> = {
    olx: process.env.TARGET_URL || 'https://www.olx.com.br/estado-rj/rio-de-janeiro-e-regiao/itaborai-e-regiao/marica',
    zap: process.env.ZAP_URL || 'https://www.zapimoveis.com.br/venda/?latitude=-22.917&longitude=-42.8175&raio=2km',
    vivareal: process.env.VIVAREAL_URL || 'https://www.vivareal.com.br/venda/?latitude=-22.917&longitude=-42.8175&raio=2km',
    agency: '',
  };

  for (const src of sources.filter(s => s !== 'agency')) {
    all.push(...await scrapeSource(src, urls[src], undefined, src === 'olx' ? maxPages : 1)); // Zap/VivaReal: só 1 página
  }

  if (process.env.AGENCY_ENABLE === 'true' || sources.includes('agency')) {
    const agencies = (process.env.AGENCY_URLS || '').split(',').map(u => u.trim()).filter(Boolean);
    for (const rawUrl of agencies) {
      try {
        const urlObj = new URL(rawUrl);
        const domain = urlObj.hostname.replace('www.', '');
        const cleanUrl = urlObj.origin + urlObj.pathname;
        all.push(...await scrapeSource('agency', cleanUrl, domain, 1));
        await new Promise(r => setTimeout(r, CONFIG.BASE_DELAY * 2));
      } catch {}
    }
  }
  const unique = Array.from(new Map(all.map(r => [r.url, r])).values());
  logger.info({ total: all.length, unique: unique.length }, '🎯 Todas fontes');
  return unique;
}


