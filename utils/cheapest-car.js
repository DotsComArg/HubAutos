// api/cheapest-car.js
//
//  ➜   GET /api/cheapest-car?q=toyota corolla 100000 km&year=2024&limit=1
//  ➜   Requiere:  npm i puppeteer-core@21.5.2 @sparticuz/chromium-min@119.0.2
// ------------------------------------------------------------------------

const dotenv    = require('dotenv');
dotenv.config();

const puppeteer = require('puppeteer-core');
const { getChromiumConfig, isChromiumAvailable } = require('../config/chromium.js');
let url = '';

/* ----------  User-Agent pool  ---------- */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

/* ----------  Random User-Agent  ---------- */
const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

/* ----------  Extract Price from Text  ---------- */
const extractPrice = (priceText) => {
  if (!priceText) return null;
  
  // Remove currency symbols and commas, keep only numbers
  const cleanPrice = priceText.replace(/[^\d,]/g, '').replace(',', '');
  const price = parseInt(cleanPrice);
  
  return isNaN(price) ? null : price;
};

/* ----------  Extract Year from Text  ---------- */
const extractYear = (text) => {
  if (!text) return null;
  
  // Look for 4-digit year pattern
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0]) : null;
};

/* ----------  Extract Kilometers from Text  ---------- */
const extractKilometers = (text) => {
  if (!text) return null;
  
  // Look for km patterns
  const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilómetros|kilometros)/i);
  if (kmMatch) {
    return parseInt(kmMatch[1].replace('.', ''));
  }
  
  // Look for numbers that might be kilometers
  const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1].replace('.', ''));
    // If it's a reasonable km value (between 0 and 1,000,000)
    if (num >= 0 && num <= 1000000) {
      return num;
    }
  }
  
  return null;
};

/* ----------  Main Function  ---------- */
async function getCheapestCar(query, year = null, limit = 5) {
  let browser = null;
  
  try {
    // Verificar si Chromium está disponible
    const chromiumAvailable = await isChromiumAvailable();
    if (!chromiumAvailable) {
      return { error: 'Chromium no está disponible en este entorno' };
    }

    // Obtener configuración optimizada para Vercel
    const launchOptions = getChromiumConfig();

    console.log('Iniciando Chromium...');
    browser = await puppeteer.launch(launchOptions);
    console.log('Chromium iniciado correctamente');

    const page = await browser.newPage();
    
    // Set random user agent
    await page.setUserAgent(getRandomUserAgent());
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Build search URL
    const searchQuery = encodeURIComponent(query);
    url = `https://autos.mercadolibre.com.ar/${searchQuery}`;
    
    if (year) {
      url += `_VEHICLE*YEAR_${year}-${year}`;
    }
    
    url += '_OrderId_PRICE_NoIndex_True';
    
    console.log('Navegando a:', url);
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('Esperando que la página cargue...');
    
    // Wait for content to load
    await page.waitForTimeout(8000);
    
    // Try multiple selectors for finding items
    const selectors = [
      'li.ui-search-layout__item',
      'div.ui-search-result__wrapper',
      '.ui-search-result',
      '[data-testid="search-result"]',
      '.andes-card.poly-card',
      '.ui-search-layout__item'
    ];
    
    let items = [];
    let selectorFound = false;
    
    for (const selector of selectors) {
      try {
        console.log(`Probando selector: ${selector}`);
        items = await page.$$(selector);
        
        if (items.length > 0) {
          console.log(`Selector ${selector} encontrado con ${items.length} elementos`);
          selectorFound = true;
          break;
        } else {
          console.log(`Selector ${selector} no encontrado, probando siguiente...`);
        }
      } catch (error) {
        console.log(`Error con selector ${selector}:`, error.message);
        continue;
      }
    }
    
    if (!selectorFound) {
      console.log('Ningún selector funcionó, intentando con evaluación directa...');
      
      // Try to find items using page.evaluate
      items = await page.evaluate(() => {
        const allItems = [];
        
        // Try different approaches to find items
        const approaches = [
          () => document.querySelectorAll('li.ui-search-layout__item'),
          () => document.querySelectorAll('.andes-card.poly-card'),
          () => document.querySelectorAll('[data-testid="search-result"]'),
          () => document.querySelectorAll('.ui-search-result'),
          () => document.querySelectorAll('.andes-card'),
          () => document.querySelectorAll('li')
        ];
        
        for (const approach of approaches) {
          try {
            const elements = approach();
            if (elements.length > 0) {
              return Array.from(elements);
            }
          } catch (e) {
            continue;
          }
        }
        
        return [];
      });
    }
    
    console.log(`Items encontrados: ${items.length}`);
    
    if (items.length === 0) {
      return { error: 'Sin resultados' };
    }
    
    // Extract data from items
    const carData = [];
    
    for (let i = 0; i < Math.min(items.length, limit); i++) {
      try {
        const item = items[i];
        
        // Extract title
        const titleSelectors = [
          '.poly-component__title-wrapper a',
          'h2 a',
          '.andes-typography--weight-semibold',
          'h3',
          '.ui-search-item__title',
          '.ui-search-item__group__title'
        ];
        
        let title = '';
        for (const titleSelector of titleSelectors) {
          try {
            const titleElement = await item.$(titleSelector);
            if (titleElement) {
              title = await titleElement.evaluate(el => el.textContent.trim());
              if (title) break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Extract price
        const priceSelectors = [
          '.andes-money-amount__fraction',
          '.andes-money-amount',
          '.price__fraction',
          '.price__symbol',
          '.andes-money-amount--cents-superscript .andes-money-amount__fraction',
          '.andes-money-amount--cents-comma .andes-money-amount__fraction'
        ];
        
        let price = null;
        for (const priceSelector of priceSelectors) {
          try {
            const priceElement = await item.$(priceSelector);
            if (priceElement) {
              const priceText = await priceElement.evaluate(el => el.textContent.trim());
              price = extractPrice(priceText);
              if (price) break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Extract attributes (year, km, etc.)
        const attributesSelectors = [
          '.poly-attributes_list',
          '.ui-search-item__group__element',
          '.andes-money-amount__cents',
          '.ui-search-item__group__element--attributes',
          '.andes-typography--size-xs'
        ];
        
        let attributes = '';
        for (const attrSelector of attributesSelectors) {
          try {
            const attrElement = await item.$(attrSelector);
            if (attrElement) {
              attributes = await attrElement.evaluate(el => el.textContent.trim());
              if (attributes) break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Extract year and kilometers from title and attributes
        const yearFromTitle = extractYear(title);
        const yearFromAttributes = extractYear(attributes);
        const kmFromTitle = extractKilometers(title);
        const kmFromAttributes = extractKilometers(attributes);
        
        const extractedYear = yearFromTitle || yearFromAttributes;
        const extractedKm = kmFromTitle || kmFromAttributes;
        
        // Extract URL
        const urlSelectors = [
          '.poly-component__title-wrapper a',
          'h2 a',
          'a[href*="mercadolibre"]',
          '.ui-search-item__group__element a'
        ];
        
        let itemUrl = '';
        for (const urlSelector of urlSelectors) {
          try {
            const urlElement = await item.$(urlSelector);
            if (urlElement) {
              itemUrl = await urlElement.evaluate(el => el.href);
              if (itemUrl) break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (title && price) {
          carData.push({
            title: title,
            price: price,
            year: extractedYear,
            kilometers: extractedKm,
            attributes: attributes,
            url: itemUrl
          });
        }
        
      } catch (error) {
        console.log(`Error procesando item ${i}:`, error.message);
        continue;
      }
    }
    
    // Sort by price and return the cheapest
    carData.sort((a, b) => a.price - b.price);
    
    return carData.length > 0 ? carData[0] : { error: 'Sin resultados válidos' };
    
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    return { error: error.message };
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('Navegador cerrado correctamente');
      } catch (closeError) {
        console.error('Error cerrando navegador:', closeError.message);
      }
    }
  }
}

/* ----------  Export  ---------- */
module.exports = { getCheapestCar }; 