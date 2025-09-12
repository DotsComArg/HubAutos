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

/* ----------  Detectar entorno  ---------- */
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const isLocal = !isProduction;

/* ====================================================================== */
/*  Main Function                                                         */
/* ====================================================================== */
async function getCheapestCar(query, year, limit = 1) {
  try {
    console.log(`🚗 Buscando vehículos: ${query} ${year}`);

    /* 1. Parámetros ----------------------------------------------------- */
    if (!query) return { error: 'Parametro query requerido' };

    /* 2. Lanzar Chromium ------------------------------------------------ */
    let browserConfig = {
      args: [...chromium.args, `--user-agent=${pickUA()}`],
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    };

    // Configuración específica para producción (Vercel)
    if (isProduction) {
      browserConfig.executablePath = await chromium.executablePath(PACK_URL);
    } else {
      // Configuración para desarrollo local
      browserConfig.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      browserConfig.headless = true;
    }

    const browser = await puppeteer.launch(browserConfig);

    const page = await browser.newPage();
    
    // Configurar headers más realistas para evitar detección de bot
    await page.setExtraHTTPHeaders({
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'es-AR,es;q=0.9,en;q=0.8',
      'accept-encoding': 'gzip, deflate, br',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1'
    });
    
    // Configurar viewport y user agent más realista
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.setUserAgent(pickUA());
    
    // Interceptar requests pero ser más selectivo
    await page.setRequestInterception(true);
    page.on('request', request => {
      const resourceType = request.resourceType();
      const url = request.url();
      
      // Bloquear recursos innecesarios pero mantener algunos para parecer más real
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        request.abort();
      } else if (url.includes('google-analytics') || url.includes('googletagmanager') || url.includes('facebook.net')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    /* 3. Construir URL -------------------------------------------------- */
    const tokens = query.trim().split(/\s+/);
    let yearParam = null;

    if (year && /^\d{4}$/.test(year)) {
      yearParam = year;
    } else {
      for (const tok of tokens)
        if (/^\d{4}$/.test(tok) && tok >= 1900 && tok <= 2099) { yearParam = tok; break; }
    }

    // Filtrar el kilometraje de la búsqueda (números que no son años)
    const words = yearParam ? tokens.filter(t => t !== yearParam.toString()) : tokens;
    const filteredWords = words.filter(word => {
      // Excluir números que parecen kilometraje (4-6 dígitos)
      if (/^\d{4,6}$/.test(word)) return false;
      // Excluir palabras como "km", "kilometros", etc.
      if (/^km|kilometros?$/i.test(word)) return false;
      return true;
    });
    
    // Usar la estructura correcta de MercadoLibre como en el ejemplo
    const searchQuery = filteredWords.join(' ').toLowerCase();
    const slug = searchQuery.replace(/\s+/g, '-');
    
    // Construir URL en el formato correcto
    url = `https://listado.mercadolibre.com.ar/${slug}?sb=all_mercadolibre`;
    
    // Agregar filtro de año si existe
    if (yearParam) {
      const encodedQuery = encodeURIComponent(searchQuery);
      url += `#D[A:${encodedQuery}]`;
    }
    
    console.log('🌐 URL:', url);

    /* 4. Scraping ------------------------------------------------------- */
    console.log('🌐 Navegando a:', url);
    
    // Navegar con comportamiento más humano
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Esperar un poco para que la página cargue completamente
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar si estamos en la página de login
    const isLoginPage = await page.evaluate(() => {
      return document.body.innerText.includes('Para continuar, ingresa a') || 
             document.body.innerText.includes('Soy nuevo') ||
             document.body.innerText.includes('Ya tengo cuenta');
    });
    
    if (isLoginPage) {
      console.log('⚠️ Detectada página de login, intentando bypass...');
      
      // Intentar navegar directamente a la URL sin parámetros de filtro
      const cleanUrl = url.split('#')[0];
      console.log('🔄 Intentando URL limpia:', cleanUrl);
      
      await page.goto(cleanUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Verificar el contenido de la página
    const pageContent = await page.evaluate(() => document.body.innerText);
    console.log('📄 Contenido de la página:', pageContent.substring(0, 300));
    
    // Verificar si aún estamos en login después del bypass
    const stillLoginPage = await page.evaluate(() => {
      return document.body.innerText.includes('Para continuar, ingresa a') || 
             document.body.innerText.includes('Soy nuevo') ||
             document.body.innerText.includes('Ya tengo cuenta');
    });
    
    if (stillLoginPage) {
      await browser.close();
      return {
        error: 'MercadoLibre está bloqueando el acceso. Se requiere autenticación.',
        query: `${query} ${year}`,
        url: url
      };
    }
    
    // Esperar por elementos específicos con timeout más corto
    try {
      await page.waitForSelector('li.ui-search-layout__item', { timeout: 10000 });
      console.log('✅ Encontrado li.ui-search-layout__item');
    } catch (e) {
      console.log('⚠️ No se encontró li.ui-search-layout__item, intentando continuar...');
    }

    // Verificar qué elementos existen realmente
    const debugInfo = await page.evaluate(() => {
      const selectors = [
        'li.ui-search-layout__item',
        'div.ui-search-result__wrapper', 
        'a.poly-component__title',
        '.andes-money-amount__fraction',
        '.poly-attributes_list__item',
        'section.ui-search-results',
        'ol.ui-search-layout'
      ];
      
      const results = {};
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        results[selector] = elements.length;
      });
      
      return results;
    });
    
    console.log('🔍 Debug - Elementos encontrados:', debugInfo);

    /* --- BLOQUE evaluate: scraping robusto para MercadoLibre ---------- */
    const items = await page.evaluate(() => {
      const toNumber = txt => {
        const m = (txt || '').match(/\d[\d.]*/);
        return m ? +m[0].replace(/\./g, '') : null;
      };
      
      // Función para extraer datos de un elemento
      const extractVehicleData = (element) => {
        // Título y link - múltiples selectores
        const titleSelectors = [
          'a.poly-component__title',
          'h2.poly-component__title-wrapper a',
          'h3.poly-component__title-wrapper a',
          'a.ui-search-item__title',
          'h2.ui-search-item__title a',
          '.ui-search-item__title'
        ];
        
        let titleAnchor = null;
        let title = '';
        let link = '';
        
        for (const selector of titleSelectors) {
          titleAnchor = element.querySelector(selector);
          if (titleAnchor) {
            title = titleAnchor.innerText?.trim() || '';
            link = titleAnchor.href || '';
            break;
          }
        }
        
        // Imagen - múltiples selectors
        const imgSelectors = [
          'img.poly-component__picture',
          'img.ui-search-result-image__element',
          '.ui-search-result-image__element img',
          'img'
        ];
        
        let image = '';
        for (const selector of imgSelectors) {
          const img = element.querySelector(selector);
          if (img && img.src) {
            image = img.src;
            break;
          }
        }
        
        // Precio y moneda - múltiples selectores
        const priceSelectors = [
          '.andes-money-amount__fraction',
          '.price-tag-fraction',
          '.ui-search-price__part',
          '.ui-search-price'
        ];
        
        const currencySelectors = [
          '.andes-money-amount__currency-symbol',
          '.price-tag-symbol',
          '.ui-search-price__symbol'
        ];
        
        let priceFraction = '';
        let currency = '';
        
        for (const selector of priceSelectors) {
          const priceEl = element.querySelector(selector);
          if (priceEl) {
            priceFraction = priceEl.innerText?.trim() || '';
            break;
          }
        }
        
        for (const selector of currencySelectors) {
          const currencyEl = element.querySelector(selector);
          if (currencyEl) {
            currency = currencyEl.innerText?.trim() || '';
            break;
          }
        }
        
        const price = toNumber(priceFraction);
        
        // Año y km - múltiples selectores
        const attrSelectors = [
          '.poly-attributes_list__item',
          '.ui-search-item__attributes',
          '.ui-search-item__subtitle'
        ];
        
        let year = '', km = '';
        for (const selector of attrSelectors) {
          const attrs = element.querySelectorAll(selector);
          if (attrs.length > 0) {
            year = attrs[0].innerText?.trim() || '';
            if (attrs.length > 1) km = attrs[1].innerText?.trim() || '';
            break;
          }
        }
        
        // Ubicación - múltiples selectores
        const locationSelectors = [
          '.poly-component__location',
          '.ui-search-item__location',
          '.ui-search-item__subtitle'
        ];
        
        let location = '';
        for (const selector of locationSelectors) {
          const locEl = element.querySelector(selector);
          if (locEl) {
            location = locEl.innerText?.trim() || '';
            break;
          }
        }
        
        // Validado
        const validatedSelectors = [
          '.poly-pill__pill',
          '.ui-search-item__badge',
          '.ui-search-item__verified'
        ];
        
        let validated = false;
        for (const selector of validatedSelectors) {
          if (element.querySelector(selector)) {
            validated = true;
            break;
          }
        }
        
        return { title, link, image, price, currency, year, km, location, validated };
      };
      
      // Intentar múltiples selectores para encontrar elementos de vehículos
      const containerSelectors = [
        'div.ui-search-result__wrapper',
        'li.ui-search-layout__item',
        '.ui-search-result__wrapper',
        '.ui-search-layout__item',
        'article.ui-search-result'
      ];
      
      let elements = [];
      let usedSelector = '';
      
      for (const selector of containerSelectors) {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          usedSelector = selector;
          console.log(`✅ Usando selector: ${selector} - ${elements.length} elementos`);
          break;
        }
      }
      
      if (elements.length === 0) {
        console.log('❌ No se encontraron elementos de vehículos');
        return [];
      }
      
      const results = Array.from(elements)
        .map(extractVehicleData)
        .filter(item => item && item.title && item.price);
      
      console.log(`📊 Extraídos ${results.length} vehículos válidos de ${elements.length} elementos`);
      return results;
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