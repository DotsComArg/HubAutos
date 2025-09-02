// api/cheapest-car.js
//
//  ➜   GET /api/cheapest-car?q=toyota corolla 100000 km&year=2024&limit=1
//  ➜   Requiere:  npm i puppeteer-core@21.5.2 chrome-aws-lambda@10.1.0
// ------------------------------------------------------------------------

const dotenv    = require('dotenv');
dotenv.config();

const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');
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

/* ----------  Scraping function  ---------- */
async function scrapeMercadoLibre(query, year, limit = 1) {
  let browser;
  
  try {
    console.log(`🔍 Iniciando búsqueda: ${query} ${year}`);
    
    // Configuración optimizada para Vercel con chrome-aws-lambda
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      timeout: 30000
    });

    const page = await browser.newPage();
    
    // Configurar User-Agent aleatorio
    await page.setUserAgent(getRandomUserAgent());
    
    // Configurar viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Configurar timeout
    page.setDefaultTimeout(30000);
    
    // Construir URL de búsqueda
    const searchQuery = encodeURIComponent(`${query} ${year}`);
    url = `https://www.mercadolibre.com.ar/c/autos-motos-y-otros#menu=categories&search=${searchQuery}`;
    
    console.log(`🌐 Navegando a: ${url}`);
    
    // Navegar a la página
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Esperar a que carguen los resultados
    await page.waitForSelector('[data-testid="results"]', { timeout: 10000 });
    
    // Extraer datos de los vehículos
    const vehicles = await page.evaluate((limit) => {
      const items = document.querySelectorAll('[data-testid="results"] article');
      const results = [];
      
      for (let i = 0; i < Math.min(items.length, limit); i++) {
        const item = items[i];
        
        try {
          const titleElement = item.querySelector('h2 a');
          const priceElement = item.querySelector('[data-testid="price"] span');
          const locationElement = item.querySelector('[data-testid="location"]');
          const linkElement = item.querySelector('h2 a');
          
          if (titleElement && priceElement) {
            const title = titleElement.textContent.trim();
            const price = priceElement.textContent.trim();
            const location = locationElement ? locationElement.textContent.trim() : '';
            const link = linkElement ? linkElement.href : '';
            
            results.push({
              title,
              price,
              location,
              link,
              source: 'MercadoLibre'
            });
          }
        } catch (error) {
          console.log(`Error procesando item ${i}:`, error.message);
        }
      }
      
      return results;
    }, limit);
    
    console.log(`✅ Encontrados ${vehicles.length} vehículos`);
    return vehicles;
    
  } catch (error) {
    console.error('❌ Error durante el scraping:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
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