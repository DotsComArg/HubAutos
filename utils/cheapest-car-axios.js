// Versión alternativa del scrapper usando axios + cheerio
const axios = require('axios');
const cheerio = require('cheerio');

/* ====================================================================== */
/*  Main Function - Versión con Axios + Cheerio                          */
/* ====================================================================== */
async function getCheapestCarAxios(query, year, limit = 1) {
  try {
    console.log(`🚗 Buscando vehículos con Axios: ${query} ${year}`);

    /* 1. Parámetros ----------------------------------------------------- */
    if (!query) return { error: 'Parametro query requerido' };

    /* 2. Construir URL -------------------------------------------------- */
    const tokens = query.trim().split(/\s+/);
    let yearParam = null;

    if (year && /^\d{4}$/.test(year)) {
      yearParam = year;
    } else {
      for (const tok of tokens)
        if (/^\d{4}$/.test(tok) && tok >= 1900 && tok <= 2099) { yearParam = tok; break; }
    }

    // Filtrar el kilometraje de la búsqueda
    const words = yearParam ? tokens.filter(t => t !== yearParam.toString()) : tokens;
    const filteredWords = words.filter(word => {
      if (/^\d{4,6}$/.test(word)) return false;
      if (/^km|kilometros?$/i.test(word)) return false;
      return true;
    });
    
    // Usar búsqueda más simple para evitar detección
    const searchQuery = filteredWords.join(' ');
    
    // Usar la página de búsqueda general de autos
    let url = `https://listado.mercadolibre.com.ar/autos`;
    
    // Agregar parámetros de búsqueda simples
    const searchParams = new URLSearchParams({
      'q': searchQuery
    });
    
    if (yearParam) {
      searchParams.append('VEHICLE_YEAR', yearParam);
    }
    
    url += `?${searchParams.toString()}`;
    
    console.log('🌐 URL:', url);

    /* 3. Hacer petición HTTP ------------------------------------------- */
    // Simular navegación más humana - ir primero a la página principal
    console.log('🏠 Visitando página principal primero...');
    await axios.get('https://www.mercadolibre.com.ar', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    // Esperar un poco como humano
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Ahora hacer la búsqueda específica
    console.log('🚗 Haciendo búsqueda específica...');
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.mercadolibre.com.ar',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Tamaño del HTML: ${response.data.length} caracteres`);

    // Verificar si estamos en la página de login
    if (response.data.includes('Para continuar, ingresa a') || 
        response.data.includes('Soy nuevo') ||
        response.data.includes('Ya tengo cuenta')) {
      console.log('⚠️ Detectada página de login');
      return {
        error: 'MercadoLibre está bloqueando el acceso. Se requiere autenticación.',
        query: `${query} ${year}`,
        url: url
      };
    }

    /* 4. Parsear HTML con Cheerio -------------------------------------- */
    const $ = cheerio.load(response.data);
    
    const toNumber = txt => {
      const m = (txt || '').match(/\d[\d.]*/);
      return m ? +m[0].replace(/\./g, '') : null;
    };

    // Buscar elementos de vehículos
    const vehicles = [];
    
    $('li.ui-search-layout__item').each((index, element) => {
      const $el = $(element);
      
      // Título y link
      const titleEl = $el.find('a.poly-component__title, h2.poly-component__title-wrapper a, h3.poly-component__title-wrapper a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href') || '';
      
      if (!title) return; // Saltar si no hay título
      
      // Imagen
      const imgEl = $el.find('img.poly-component__picture, img.ui-search-result-image__element, img').first();
      const image = imgEl.attr('src') || '';
      
      // Precio
      const priceEl = $el.find('.andes-money-amount__fraction, .price-tag-fraction, .ui-search-price__part').first();
      const priceText = priceEl.text().trim();
      const price = toNumber(priceText);
      
      if (!price) return; // Saltar si no hay precio
      
      // Moneda
      const currencyEl = $el.find('.andes-money-amount__currency-symbol, .price-tag-symbol, .ui-search-price__symbol').first();
      const currency = currencyEl.text().trim() || '$';
      
      // Año y km
      const attrs = $el.find('.poly-attributes_list__item, .ui-search-item__attributes, .ui-search-item__subtitle');
      let year = '', km = '';
      if (attrs.length > 0) year = attrs.eq(0).text().trim();
      if (attrs.length > 1) km = attrs.eq(1).text().trim();
      
      // Ubicación
      const locationEl = $el.find('.poly-component__location, .ui-search-item__location, .ui-search-item__subtitle').first();
      const location = locationEl.text().trim() || '';
      
      // Validado
      const validated = $el.find('.poly-pill__pill, .ui-search-item__badge, .ui-search-item__verified').length > 0;
      
      vehicles.push({
        title,
        link,
        image,
        price,
        currency,
        year,
        km,
        location,
        validated
      });
    });

    console.log(`✅ Vehículos encontrados: ${vehicles.length}`);

    if (vehicles.length === 0) {
      return {
        error: 'No se encontraron vehículos',
        query: `${query} ${year}`,
        url: url
      };
    }

    /* 5. Ordenar y filtrar --------------------------------------------- */
    const sortedVehicles = vehicles
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);

    const result = limit == 1 ? sortedVehicles[0] : sortedVehicles;
    
    return {
      success: true,
      query: `${query} ${year}`,
      vehicles: limit == 1 ? [result] : result,
      url: url,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    console.error('❌ Error en getCheapestCarAxios:', err);
    return {
      error: 'Error interno del servidor',
      details: err.message,
      query: `${query} ${year}`,
      url: url || 'No generada'
    };
  }
}

module.exports = { getCheapestCarAxios };
