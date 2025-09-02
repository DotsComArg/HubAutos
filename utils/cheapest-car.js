// api/cheapest-car.js
//
//  ➜   GET /api/cheapest-car?q=toyota corolla 100000 km&year=2024&limit=1
//  ➜   Requiere:  npm i puppeteer-core
// ------------------------------------------------------------------------

const dotenv    = require('dotenv');
dotenv.config();

const puppeteer = require('puppeteer-core');
let url = '';

/* ----------  User-Agent pool  ---------- */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];
const pickUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/* ====================================================================== */
/*  Main Function                                                         */
/* ====================================================================== */
async function getCheapestCar(query, year, limit = 1) {
  try {
    console.log(`🚗 Buscando vehículos: ${query} ${year}`);

    /* 1. Parámetros ----------------------------------------------------- */
    if (!query) return { error: 'Parametro query requerido' };

    /* 2. Lanzar Chromium ------------------------------------------------ */
    // Configuración para Vercel/Serverless
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        `--user-agent=${pickUA()}`
      ]
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'accept-language': 'es-AR,es;q=0.9', dnt: '1' });
    await page.setRequestInterception(true);
    page.on('request', r =>
      ['image', 'media', 'font'].includes(r.resourceType()) ? r.abort() : r.continue()
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
    url = `https://autos.mercadolibre.com.ar/${basePath}_OrderId_PRICE_NoIndex_True?sb=category`;

    if (yearParam) {
      url += `#applied_filter_id=VEHICLE_YEAR&applied_filter_name=A%C3%B1o` +
             `&applied_filter_order=8&applied_value_id=[${yearParam}-${yearParam}]` +
             `&applied_value_name=${yearParam}&applied_value_order=2&applied_value_results=0&is_custom=false`;
    }
    
    console.log('🌐 URL:', url);

    /* 4. Scraping ------------------------------------------------------- */
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('li.ui-search-layout__item', { timeout: 10000 });

    /* --- BLOQUE evaluate: ajustado para poly-card ----------------- */
    const items = await page.evaluate(() => {
      const toNumber = txt => {
        const m = (txt || '').match(/\d[\d.]*/);
        return m ? +m[0].replace(/\./g, '') : null;
      };
      return Array.from(document.querySelectorAll('div.ui-search-result__wrapper'))
        .map(wrapper => {
          const card = wrapper.querySelector('.poly-card');
          if (!card) return null;
          // Título y link
          const titleAnchor = card.querySelector('a.poly-component__title');
          const title = titleAnchor?.innerText.trim() || '';
          const link = titleAnchor?.href || '';
          // Imagen
          const img = card.querySelector('img.poly-component__picture');
          const image = img?.src || '';
          // Precio y moneda
          const priceFraction = card.querySelector('.andes-money-amount__fraction')?.innerText.trim() || '';
          const currency = card.querySelector('.andes-money-amount__currency-symbol')?.innerText.trim() || '';
          const price = toNumber(priceFraction);
          // Año y km
          const attrs = card.querySelectorAll('.poly-attributes_list__item');
          let year = '', km = '';
          if (attrs.length > 0) year = attrs[0].innerText.trim();
          if (attrs.length > 1) km = attrs[1].innerText.trim();
          // Ubicación
          const location = card.querySelector('.poly-component__location')?.innerText.trim() || '';
          // Validado
          const validated = !!card.querySelector('.poly-pill__pill');
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