import { chromium } from 'playwright';
import 'dotenv/config';
import { writeFileSync } from 'fs';

async function debugOLX() {
  console.log('🔍 Iniciando diagnóstico da estrutura OLX...');
  
  const browser = await chromium.launch({ 
    headless: process.env.DEBUG_MODE !== 'true',
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
    locale: 'pt-BR'
  });
  
  const page = await context.newPage();
  const url = 'https://www.olx.com.br/imoveis/regiao-de-niteroi-e-macae/itaipuacu';
  
  console.log(`🌐 Navegando para: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000); // Aguarda JS dinâmico
  
  // Salva HTML completo para análise
  const html = await page.content();
  writeFileSync('debug-olx.html', html, 'utf-8');
  console.log('💾 HTML salvo em: debug-olx.html');
  
  // Diagnóstico de possíveis containers de listing
  console.log('\n📊 Buscando possíveis containers de imóveis...');
  const candidates = await page.evaluate(() => {
    const results: Array<{ selector: string; count: number; sample?: any }> = [];
    
    // Testa múltiplos padrões comuns
    const patterns = [
      '[data-testid*="ad"]',
      'article',
      'div[class*="card"]',
      'div[class*="listing"]',
      'section[class*="item"]',
      'div > div > div:has(a[href*="/imovel/"])'
    ];
    
    for (const pattern of patterns) {
      try {
        const els = document.querySelectorAll(pattern);
        if (els.length > 0) {
          const sample = els[0];
          results.push({
            selector: pattern,
            count: els.length,
            sample: {
              tag: sample.tagName,
              classes: sample.className?.slice(0, 150),
              id: sample.id,
              dataset: Object.keys(sample.dataset || {}),
              text: sample.textContent?.trim().slice(0, 100)
            }
          });
        }
      } catch {}
    }
    
    return results.sort((a, b) => b.count - a.count).slice(0, 5);
  });
  
  candidates.forEach((c, i) => {
    console.log(`\n${i+1}. ${c.selector}`);
    console.log(`   📦 Encontrados: ${c.count}`);
    console.log(`   🏷️  Tag: <${c.sample.tag}>`);
    console.log(`   🎨 Classes: "${c.sample.classes}"`);
    console.log(`   📝 Texto: "${c.sample.text}"`);
    console.log(`   🔑 Data attrs: [${c.sample.dataset.join(', ')}]`);
  });
  
  // Busca elementos com texto de preço (padrão OLX)
  console.log('\n💰 Buscando elementos que contêm "R$"...');
  const priceElements = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent?.trim();
      return text?.includes('R$') && text.length < 50 && el.children.length === 0;
    }).slice(0, 3);
    return els.map(el => ({
      tag: el.tagName,
      class: el.className?.slice(0, 100),
      text: el.textContent?.trim(),
      selector: el.id ? `#${el.id}` : el.className?.split(' ')[0] ? `.${el.className.split(' ')[0]}` : el.tagName
    }));
  });
  
  priceElements.forEach((el, i) => {
    console.log(`   ${i+1}. <${el.tag}> ${el.selector} → "${el.text}"`);
  });
  
  console.log('\n✅ Diagnóstico concluído!');
  console.log('📁 Abra "debug-olx.html" no navegador para inspecionar manualmente.');
  console.log('🔚 Pressione Enter para fechar...');
  
  await new Promise(resolve => { process.stdin.resume(); process.stdin.once('data', resolve); });
  await browser.close();
}

debugOLX().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
