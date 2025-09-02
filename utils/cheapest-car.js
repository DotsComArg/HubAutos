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

/* ----------  Build correct MercadoLibre URL  ---------- */
function buildMercadoLibreURL(query, year) {
  // Limpiar y formatear la query
  const cleanQuery = query
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Construir URL en el formato correcto de MercadoLibre autos
  return `https://autos.mercadolibre.com.ar/${year}/${cleanQuery}_OrderId_PRICE_NoIndex_True`;
}

/* ----------  Extract data from HTML  ---------- */
function extractVehiclesFromHTML(html, limit = 1) {
  const vehicles = [];
  
  try {
    // Buscar artículos de vehículos usando regex
    const articleRegex = /<article[^>]*>.*?<\/article>/gs;
    const articles = html.match(articleRegex) || [];
    
    for (let i = 0; i < Math.min(articles.length, limit); i++) {
      const article = articles[i];
      
      try {
        // Extraer título
        const titleMatch = article.match(/<h2[^>]*>.*?<a[^>]*>([^<]+)<\/a>/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        // Extraer precio
        const priceMatch = article.match(/data-testid="price"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/);
        const price = priceMatch ? priceMatch[1].trim() : '';
        
        // Extraer ubicación
        const locationMatch = article.match(/data-testid="location"[^>]*>([^<]+)</);
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
    
    // Construir URL correcta de MercadoLibre autos
    url = buildMercadoLibreURL(query, year);
    
    console.log(`🌐 Navegando a: ${url}`);
    
    // Configurar headers para simular navegador
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    };
    
    // Hacer request HTTP
    const response = await axios.get(url, {
      headers,
      timeout: 30000,
      maxRedirects: 5
    });
    
    console.log(`✅ Respuesta recibida, status: ${response.status}`);
    
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