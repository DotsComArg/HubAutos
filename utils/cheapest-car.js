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
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

/* ----------  Random User-Agent  ---------- */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/* ----------  Build simple search URL  ---------- */
function buildSearchURL(query, year) {
  // Simplificar la query para búsqueda más amplia
  const simpleQuery = query
    .split(' ')
    .slice(0, 3) // Tomar solo las primeras 3 palabras
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Usar URL de búsqueda simple
  return `https://autos.mercadolibre.com.ar/${year}/${simpleQuery}`;
}

/* ----------  Extract data from HTML  ---------- */
function extractVehiclesFromHTML(html, limit = 1) {
  const vehicles = [];
  
  try {
    // Buscar diferentes patrones de artículos
    const patterns = [
      /<article[^>]*>.*?<\/article>/gs,
      /<div[^>]*class="[^"]*ui-search-result[^"]*"[^>]*>.*?<\/div>/gs,
      /<li[^>]*class="[^"]*ui-search-layout__item[^"]*"[^>]*>.*?<\/li>/gs
    ];
    
    let articles = [];
    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        articles = matches;
        break;
      }
    }
    
    console.log(`📊 Encontrados ${articles.length} artículos en el HTML`);
    
    for (let i = 0; i < Math.min(articles.length, limit); i++) {
      const article = articles[i];
      
      try {
        // Extraer título - múltiples patrones
        const titlePatterns = [
          /<h2[^>]*>.*?<a[^>]*>([^<]+)<\/a>/,
          /<h3[^>]*>([^<]+)<\/h3>/,
          /class="[^"]*title[^"]*"[^>]*>([^<]+)</,
          /data-testid="[^"]*title[^"]*"[^>]*>([^<]+)</
        ];
        
        let title = '';
        for (const pattern of titlePatterns) {
          const match = article.match(pattern);
          if (match) {
            title = match[1].trim();
            break;
          }
        }
        
        // Extraer precio - múltiples patrones
        const pricePatterns = [
          /data-testid="price"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/,
          /class="[^"]*price[^"]*"[^>]*>([^<]+)</,
          /<span[^>]*class="[^"]*andes-money-amount[^"]*"[^>]*>([^<]+)</,
          /<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)</
        ];
        
        let price = '';
        for (const pattern of pricePatterns) {
          const match = article.match(pattern);
          if (match) {
            price = match[1].trim();
            break;
          }
        }
        
        // Extraer ubicación
        const locationMatch = article.match(/data-testid="location"[^>]*>([^<]+)</) ||
                             article.match(/class="[^"]*location[^"]*"[^>]*>([^<]+)</);
        const location = locationMatch ? locationMatch[1].trim() : '';
        
        // Extraer link
        const linkMatch = article.match(/<a[^>]*href="([^"]*)"[^>]*>/);
        const link = linkMatch ? linkMatch[1] : '';
        
        if (title && price) {
          vehicles.push({
            title,
            price,
            location,
            link: link.startsWith('http') ? link : `https://www.mercadolibre.com.ar${link}`,
            source: 'MercadoLibre'
          });
        }
      } catch (error) {
        console.log(`Error procesando artículo ${i}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error extrayendo datos del HTML:', error.message);
  }
  
  return vehicles;
}

/* ----------  Scraping function  ---------- */
async function scrapeMercadoLibre(query, year, limit = 1) {
  try {
    console.log(`🔍 Iniciando búsqueda: ${query} ${year}`);
    
    // Construir URL de búsqueda simplificada
    url = buildSearchURL(query, year);
    
    console.log(`🌐 Navegando a: ${url}`);
    
    // Configurar headers para simular navegador
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.mercadolibre.com.ar/'
    };
    
    // Hacer request HTTP
    const response = await axios.get(url, {
      headers,
      timeout: 30000,
      maxRedirects: 5
    });
    
    console.log(`✅ Respuesta recibida, status: ${response.status}`);
    console.log(`📄 Tamaño del HTML: ${response.data.length} caracteres`);
    
    // Extraer datos del HTML
    const vehicles = extractVehiclesFromHTML(response.data, limit);
    
    console.log(`✅ Encontrados ${vehicles.length} vehículos`);
    return vehicles;
    
  } catch (error) {
    console.error('❌ Error durante el scraping:', error.message);
    return [];
  }
}

/* ----------  Main function  ---------- */
async function getCheapestCar(query, year, limit = 1) {
  try {
    console.log(`🚗 Buscando vehículos: ${query} ${year}`);
    
    const vehicles = await scrapeMercadoLibre(query, year, limit);
    
    if (vehicles.length === 0) {
      return {
        error: 'No se encontraron vehículos',
        query: `${query} ${year}`,
        url: url
      };
    }
    
    return {
      success: true,
      query: `${query} ${year}`,
      vehicles: vehicles,
      url: url,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error en getCheapestCar:', error.message);
    return {
      error: error.message,
      query: `${query} ${year}`,
      url: url
    };
  }
}

module.exports = { getCheapestCar }; 