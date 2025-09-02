// api/cheapest-car.js
//
//  ➜   GET /api/cheapest-car?q=toyota corolla 100000 km&year=2024&limit=1
//  ➜   Requiere:  npm i puppeteer-core@24.2.0 @sparticuz/chromium-min@124
// ------------------------------------------------------------------------

const dotenv    = require('dotenv');
dotenv.config();

const chromium  = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');
let url = '';

/* ----------  User-Agent pool  ---------- */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];
const pickUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/* ----------  Chromium-min pack  ---------- */
const PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  'https://github.com/Sparticuz/chromium/releases/download/v135.0.0-next.3/chromium-v135.0.0-next.3-pack.x64.tar';

/* ====================================================================== */
/*  Main Function                                                         */
/* ====================================================================== */
async function getCheapestCar(query, year, limit = 1) {
  try {
    console.log(`🚗 Buscando vehículos: ${query} ${year}`);

    /* 1. Parámetros ----------------------------------------------------- */
    if (!query) return { error: 'Parametro query requerido' };

    /* 2. Lanzar Chromium ------------------------------------------------ */
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-ipc-flooding-protection',
        `--user-agent=${pickUA()}`
      ],
      executablePath: await chromium.executablePath(PACK_URL),
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'accept-language': 'es-AR,es;q=0.9', dnt: '1' });
    await page.setRequestInterception(true);
    page.on('request', r =>
      ['image', 'media', 'font', 'stylesheet'].includes(r.resourceType()) ? r.abort() : r.continue()
    );

    /* 3. Construir URL -------------------------------------------------- */
    const tokens = query.trim().split(/\s+/);
    let yearParam = null;

    if (year && /^\d{4}$/.test(year)) {
      yearParam = year;
    } else {
      for (const tok of tokens)
        if (/^\d{4}$/.test(tok) && tok >= 1900 && tok <= 2099) { yearParam = tok; break; }
    }

    const words = yearParam ? tokens.filter(t => t !== yearParam.toString()) : tokens;
    const slug  = words.join(' ')
      .toLowerCase()
      .normalize('NFD').replace(/[^\w\s-]/g, '')
      .trim().replace(/\s+/g, '-').replace(/-+/g, '-');

    const basePath = yearParam ? `${yearParam}/${slug}` : slug;
    // Usar URL de listado en lugar de autos para evitar detección
    url = `https://listado.mercadolibre.com.ar/${slug}?sb=all_mercadolibre#D[A:${encodeURIComponent(words.join(' '))}]`;
    
    console.log('🌐 URL:', url);

    /* 4. Scraping ------------------------------------------------------- */
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Esperar un poco para que se cargue todo el contenido
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar si estamos en página de login/cookies
    const pageContent = await page.evaluate(() => document.body.innerText);
    console.log('📄 Contenido de la página:', pageContent.substring(0, 200));
    
    // Buscar directamente la sección de resultados sin importar las cookies
    console.log('🔍 Buscando sección ui-search-results...');
    
    // Esperar por elementos específicos con timeout más corto
    try {
      await page.waitForSelector('section.ui-search-results', { timeout: 10000 });
      console.log('✅ Encontrado section.ui-search-results');
    } catch (e) {
      console.log('⚠️ No se encontró section.ui-search-results, intentando continuar...');
    }

    // Verificar qué elementos existen realmente
    const debugInfo = await page.evaluate(() => {
      const selectors = [
        'section.ui-search-results',
        'li.ui-search-layout__item',
        'div.ui-search-result__wrapper', 
        'a.poly-component__title',
        '.andes-money-amount__fraction',
        '.poly-attributes_list__item'
      ];
      
      const results = {};
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        results[selector] = elements.length;
      });
      
      // También verificar el HTML completo
      const bodyText = document.body.innerText.substring(0, 500);
      
      return { counts: results, bodyPreview: bodyText };
    });
    
    console.log('🔍 Debug - Elementos encontrados:', debugInfo.counts);
    console.log('📄 Preview del body:', debugInfo.bodyPreview);

    /* --- NUEVO BLOQUE evaluate: buscar directamente en ui-search-results ---------- */
    const items = await page.evaluate(() => {
      const toNumber = txt => {
        const m = (txt || '').match(/\d[\d.]*/);
        return m ? +m[0].replace(/\./g, '') : null;
      };
      
      // Buscar directamente en la sección de resultados
      const searchResults = document.querySelector('section.ui-search-results');
      if (!searchResults) {
        console.log('❌ No se encontró section.ui-search-results');
        return [];
      }
      
      // Buscar todos los elementos de resultados dentro de la sección
      const elements = searchResults.querySelectorAll('li.ui-search-layout__item, div.ui-search-result__wrapper');
      console.log(`✅ Encontrados ${elements.length} elementos en ui-search-results`);
      
      return Array.from(elements)
        .map(item => {
          // Título y link
          const titleAnchor = item.querySelector('a.poly-component__title');
          const title = titleAnchor?.innerText.trim() || '';
          const link = titleAnchor?.href || '';
          
          // Imagen
          const img = item.querySelector('img.poly-component__picture');
          const image = img?.src || '';
          
          // Precio y moneda
          const priceFraction = item.querySelector('.andes-money-amount__fraction')?.innerText.trim() || '';
          const currency = item.querySelector('.andes-money-amount__currency-symbol')?.innerText.trim() || '';
          const price = toNumber(priceFraction);
          
          // Año y km
          const attrs = item.querySelectorAll('.poly-attributes_list__item');
          let year = '', km = '';
          if (attrs.length > 0) year = attrs[0].innerText.trim();
          if (attrs.length > 1) km = attrs[1].innerText.trim();
          
          // Ubicación
          const location = item.querySelector('.poly-component__location')?.innerText.trim() || '';
          
          // Validado
          const validated = !!item.querySelector('.poly-pill__pill');
          
          return { title, link, image, price, currency, year, km, location, validated };
        })
        .filter(i => i && i.price);
    });

    await browser.close();
    console.log('✅ Items encontrados:', items.length);

    /* 5. Post-filtros --------------------------------------------------- */
    let list = items
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);

    if (!list.length) {
      return {
        error: 'No se encontraron vehículos',
        query: `${query} ${year}`,
        url: url
      };
    }

    const result = limit == 1 ? list[0] : list;
    
    return {
      success: true,
      query: `${query} ${year}`,
      vehicles: limit == 1 ? [result] : result,
      url: url,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    console.error('❌ Error en getCheapestCar:', err);
    return {
      error: 'Error interno del servidor',
      details: err.message,
      query: `${query} ${year}`,
      url: url
    };
  }
}

module.exports = { getCheapestCar }; 