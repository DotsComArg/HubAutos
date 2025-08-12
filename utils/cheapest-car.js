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
/*  Handler                                                               */
/* ====================================================================== */
module.exports = async (data) => {
  try {
    /* 1. Parámetros ----------------------------------------------------- */
    const {
      q,
      year: yearParam,
      limit = 10,
      usedOnly=true,
      province=""
    } = data;

    if (!q) return { error: 'Parametro ?q requerido' };

    /* 2. Lanzar Chromium ------------------------------------------------ */
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args, 
        `--user-agent=${pickUA()}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      executablePath: await chromium.executablePath(PACK_URL),
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'accept-language': 'es-AR,es;q=0.9', dnt: '1' });
    await page.setRequestInterception(true);
    page.on('request', r =>
      ['image', 'media', 'font'].includes(r.resourceType()) ? r.abort() : r.continue()
    );
    
    // Configurar timeout más largo para la página
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    /* 3. Construir URL -------------------------------------------------- */
    const tokens = q.trim().split(/\s+/);
    let year = null;

    if (yearParam && /^\d{4}$/.test(yearParam)) {
      year = yearParam;
    } else {
      for (const tok of tokens)
        if (/^\d{4}$/.test(tok) && tok >= 1900 && tok <= 2099) { year = tok; break; }
    }

    const words = year ? tokens.filter(t => t !== year) : tokens;
    const slug  = words.join(' ')
      .toLowerCase()
      .normalize('NFD').replace(/[^\w\s-]/g, '')
      .trim().replace(/\s+/g, '-').replace(/-+/g, '-');

    const basePath = year ? `${year}/${slug}` : slug;
    url = `https://autos.mercadolibre.com.ar/${basePath}_OrderId_PRICE_NoIndex_True?sb=category`;

    if (province) url += `&state=${province}`;
    if (year) {
      url += `#applied_filter_id=VEHICLE_YEAR&applied_filter_name=A%C3%B1o` +
             `&applied_filter_order=8&applied_value_id=[${year}-${year}]` +
             `&applied_value_name=${year}&applied_value_order=2&applied_value_results=0&is_custom=false`;
    }
    
    console.log('URL:', url);
    /* 4. Scraping ------------------------------------------------------- */
    console.log('Navegando a:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Esperar a que la página cargue completamente
    console.log('Esperando que la página cargue...');
    await page.waitForTimeout(5000);
    
    // Verificar si hay contenido en la página
    const pageContent = await page.content();
    if (pageContent.includes('No se encontraron resultados') || pageContent.includes('no results')) {
      console.log('Página indica que no hay resultados');
      await browser.close();
      return { error: 'No se encontraron resultados para esta búsqueda' };
    }
    
    // Intentar diferentes selectores para encontrar los resultados
    let items = [];
    const selectors = [
      'li.ui-search-layout__item',
      'div.ui-search-result__wrapper',
      '.ui-search-result',
      '.ui-search-layout__item',
      '[data-testid="search-result"]'
    ];
    
    let selectorFound = false;
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        selectorFound = true;
        console.log(`Selector encontrado: ${selector}`);
        break;
      } catch (e) {
        console.log(`Selector ${selector} no encontrado, probando siguiente...`);
        continue;
      }
    }
    
    if (!selectorFound) {
      console.log('Ningún selector funcionó, intentando con evaluación directa...');
      // Intentar evaluar la página directamente
      items = await page.evaluate(() => {
        const toNumber = txt => {
          const m = (txt || '').match(/\d[\d.]*/);
          return m ? +m[0].replace(/\./g, '') : null;
        };
        
        // Buscar cualquier elemento que contenga precios
        const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"], [class*="money"], [class*="Money"]');
        if (priceElements.length === 0) {
          return [];
        }
        
        // Buscar contenedores de resultados
        const containers = document.querySelectorAll('div, li, article');
        return Array.from(containers)
          .map(container => {
            try {
              // Buscar precio
              const priceEl = container.querySelector('[class*="price"], [class*="Price"], [class*="money"], [class*="Money"]');
              if (!priceEl) return null;
              
              const priceText = priceEl.innerText.trim();
              const price = toNumber(priceText);
              if (!price) return null;
              
              // Buscar título
              const titleEl = container.querySelector('a, h2, h3, [class*="title"], [class*="Title"]');
              const title = titleEl?.innerText.trim() || '';
              
              // Buscar link
              const linkEl = container.querySelector('a');
              const link = linkEl?.href || '';
              
              // Buscar imagen
              const imgEl = container.querySelector('img');
              const image = imgEl?.src || '';
              
              return { title, link, image, price, currency: '$', year: '', km: '', location: '', validated: false };
            } catch (e) {
              return null;
            }
          })
          .filter(i => i && i.price);
      });
    } else {
      // Usar el selector que funcionó
      items = await page.evaluate(() => {
        const toNumber = txt => {
          const m = (txt || '').match(/\d[\d.]*/);
          return m ? +m[0].replace(/\./g, '') : null;
        };
        
        // Buscar resultados con diferentes estructuras
        const selectors = [
          'div.ui-search-result__wrapper',
          '.ui-search-result',
          '.ui-search-layout__item',
          '[data-testid="search-result"]'
        ];
        
        let allItems = [];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Procesando ${elements.length} elementos con selector: ${selector}`);
            
            const items = Array.from(elements)
              .map(wrapper => {
                try {
                  // Buscar precio
                  const priceEl = wrapper.querySelector('.andes-money-amount__fraction, [class*="price"], [class*="Price"]');
                  if (!priceEl) return null;
                  
                  const priceText = priceEl.innerText.trim();
                  const price = toNumber(priceText);
                  if (!price) return null;
                  
                  // Buscar título
                  const titleEl = wrapper.querySelector('a, h2, h3, [class*="title"], [class*="Title"]');
                  const title = titleEl?.innerText.trim() || '';
                  
                  // Buscar link
                  const linkEl = wrapper.querySelector('a');
                  const link = linkEl?.href || '';
                  
                  // Buscar imagen
                  const imgEl = wrapper.querySelector('img');
                  const image = imgEl?.src || '';
                  
                  // Buscar atributos (año, km)
                  const attrEls = wrapper.querySelectorAll('[class*="attr"], [class*="Attr"], span, div');
                  let year = '', km = '';
                  if (attrEls.length > 0) year = attrEls[0].innerText.trim();
                  if (attrEls.length > 1) km = attrEls[1].innerText.trim();
                  
                  // Buscar ubicación
                  const locationEl = wrapper.querySelector('[class*="location"], [class*="Location"]');
                  const location = locationEl?.innerText.trim() || '';
                  
                  return { title, link, image, price, currency: '$', year, km, location, validated: false };
                } catch (e) {
                  return null;
                }
              })
              .filter(i => i && i.price);
            
            allItems = allItems.concat(items);
          }
        }
        
        return allItems;
      });
    }

    await browser.close();
    console.log('Items encontrados:', items.length);
    if (items.length > 0) {
      console.log('Primer item:', JSON.stringify(items[0], null, 2));
    }
    
    /* 5. Post-filtros --------------------------------------------------- */
    let list = items
      //.filter(i => usedOnly ? /usado/i.test(i.condition) : true)
    //  .filter(i => maxPrice ? i.price <= +maxPrice : true)
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);
    if (!list.length) return { error: 'Sin resultados' };
    return limit == 1 ? list[0] : list;

  } catch (err) {
    console.error('Error en cheapest-car:', err);
    
    // Determinar el tipo de error
    let errorMessage = 'Error interno del servidor';
    if (err.name === 'TimeoutError') {
      errorMessage = 'Timeout: La página no cargó completamente';
    } else if (err.message.includes('selector')) {
      errorMessage = 'Error de selector: No se encontraron elementos en la página';
    } else if (err.message.includes('net::')) {
      errorMessage = 'Error de red: No se pudo conectar a MercadoLibre';
    }
    
    return { 
      error: errorMessage, 
      details: err.message, 
      url,
      stack: err.stack 
    };
  }
}; 