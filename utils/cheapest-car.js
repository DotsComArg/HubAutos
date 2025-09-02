// api/cheapest-car.js
//
//  ➜   GET /api/cheapest-car?q=toyota corolla 100000 km&year=2024&limit=1
//  ➜   Requiere:  npm i axios
// ------------------------------------------------------------------------

const dotenv    = require('dotenv');
dotenv.config();

const axios = require('axios');
let url = '';

/* ----------  User-Agent pool  ---------- */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
];
const pickUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/* ----------  Build URL function  ---------- */
function buildSearchURL(query, year) {
  const tokens = query.trim().split(/\s+/);
  const words = tokens.filter(t => t !== year.toString());
  const slug = words.join(' ')
    .toLowerCase()
    .normalize('NFD').replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-');

  return `https://autos.mercadolibre.com.ar/${year}/${slug}_OrderId_PRICE_NoIndex_True?sb=category`;
}

/* ----------  Extract data from HTML  ---------- */
function extractVehiclesFromHTML(html, limit = 1) {
  const vehicles = [];
  
  try {
    // Función para convertir texto a número
    const toNumber = txt => {
      const m = (txt || '').match(/\d[\d.]*/);
      return m ? +m[0].replace(/\./g, '') : null;
    };

    // Buscar todos los poly-component__title para encontrar títulos
    const titleMatches = html.match(/<a[^>]*class="[^"]*poly-component__title[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/g);
    
    console.log(`📊 Encontrados ${titleMatches ? titleMatches.length : 0} títulos en el HTML`);
    
    if (!titleMatches) {
      console.log('❌ No se encontraron títulos');
      return vehicles;
    }

    // Buscar todos los precios
    const priceMatches = html.match(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([^<]+)<\/span>/g);
    
    console.log(`💰 Encontrados ${priceMatches ? priceMatches.length : 0} precios en el HTML`);
    
    if (!priceMatches) {
      console.log('❌ No se encontraron precios');
      return vehicles;
    }

    // Buscar todas las monedas
    const currencyMatches = html.match(/<span[^>]*class="[^"]*andes-money-amount__currency-symbol[^"]*"[^>]*>([^<]+)<\/span>/g);
    
    console.log(`💱 Encontrados ${currencyMatches ? currencyMatches.length : 0} símbolos de moneda en el HTML`);

    // Procesar cada título encontrado
    for (let i = 0; i < Math.min(titleMatches.length, limit * 2); i++) {
      try {
        const titleMatch = titleMatches[i];
        
        // Extraer título y link
        const titleLinkMatch = titleMatch.match(/href="([^"]*)"[^>]*>([^<]+)<\/a>/);
        if (!titleLinkMatch) continue;
        
        const link = titleLinkMatch[1];
        const title = titleLinkMatch[2].trim();
        
        // Buscar precio correspondiente (asumiendo que están en orden)
        let price = null;
        let currency = '';
        
        if (priceMatches && priceMatches[i]) {
          const priceMatch = priceMatches[i].match(/>([^<]+)</);
          if (priceMatch) {
            price = toNumber(priceMatch[1]);
          }
        }
        
        if (currencyMatches && currencyMatches[i]) {
          const currencyMatch = currencyMatches[i].match(/>([^<]+)</);
          if (currencyMatch) {
            currency = currencyMatch[1].trim();
          }
        }
        
        // Si no hay moneda específica, inferirla del precio
        if (!currency && price) {
          currency = price > 10000 ? 'US$' : '$';
        }
        
        if (title && price) {
          vehicles.push({
            title,
            link,
            image: '',
            price,
            currency,
            year: '',
            km: '',
            location: '',
            validated: false
          });
        }
      } catch (error) {
        console.log(`Error procesando título ${i}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error extrayendo datos del HTML:', error.message);
  }
  
  return vehicles;
}

/* ====================================================================== */
/*  Main Function                                                         */
/* ====================================================================== */
async function getCheapestCar(query, year, limit = 1) {
  try {
    console.log(`🚗 Buscando vehículos: ${query} ${year}`);

    /* 1. Construir URL -------------------------------------------------- */
    url = buildSearchURL(query, year);
    console.log('🌐 URL:', url);

    /* 2. Configurar headers -------------------------------------------- */
    const headers = {
      'User-Agent': pickUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.mercadolibre.com.ar/'
    };

    /* 3. Hacer request HTTP --------------------------------------------- */
    const response = await axios.get(url, {
      headers,
      timeout: 30000,
      maxRedirects: 5
    });

    console.log(`✅ Respuesta recibida, status: ${response.status}`);
    console.log(`📄 Tamaño del HTML: ${response.data.length} caracteres`);

    /* 4. Extraer datos del HTML ----------------------------------------- */
    const vehicles = extractVehiclesFromHTML(response.data, limit);
    console.log('✅ Items encontrados:', vehicles.length);

    /* 5. Post-filtros --------------------------------------------------- */
    let list = vehicles
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