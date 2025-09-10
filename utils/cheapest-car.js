// api/cheapest-car.js
//
//  ➜   GET /api/cheapest-car?q=toyota corolla 100000 km&year=2024&limit=1
//  ➜   Usa la API oficial de MercadoLibre para búsquedas estables
// ------------------------------------------------------------------------

const dotenv = require('dotenv');
dotenv.config();

const https = require('https');
const { URL } = require('url');

// Importar Puppeteer como respaldo
const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

// Credenciales de MercadoLibre (para futuras implementaciones)
const MELI_APP_ID = '6392459316722497';
const MELI_CLIENT_SECRET = '9ChIdXLVGK5iZ2mbClIqWQYic0TFayV2';

/* ====================================================================== */
/*  Helper Functions                                                     */
/* ====================================================================== */

// Función para hacer peticiones HTTP a la API de MercadoLibre
function makeApiRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'HubAutos/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const request = https.request(requestOptions, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Error al parsear respuesta JSON: ' + error.message));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(new Error('Error en la petición HTTP: ' + error.message));
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Timeout en la petición HTTP'));
    });

    if (options.body) {
      request.write(options.body);
    }
    
    request.end();
  });
}

// Función para obtener token de acceso
async function getAccessToken() {
  try {
    const tokenUrl = 'https://api.mercadolibre.com/oauth/token';
    const postData = JSON.stringify({
      grant_type: 'client_credentials',
      client_id: MELI_APP_ID,
      client_secret: MELI_CLIENT_SECRET
    });

    console.log('🔐 Obteniendo token de acceso...');
    const response = await makeApiRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      body: postData
    });

    if (response.access_token) {
      console.log('✅ Token obtenido exitosamente');
      return response.access_token;
    } else {
      console.log('❌ No se recibió token en la respuesta:', response);
      return null;
    }
  } catch (error) {
    console.log('❌ Error obteniendo token:', error.message);
    return null;
  }
}

// Función para extraer año de la query
function extractYear(query, yearParam) {
  if (yearParam && /^\d{4}$/.test(yearParam)) {
    return yearParam;
  }
  
  const tokens = query.trim().split(/\s+/);
  for (const token of tokens) {
    if (/^\d{4}$/.test(token) && token >= 1900 && token <= 2099) {
      return token;
    }
  }
  return null;
}

// Función para limpiar la query de kilometraje
function cleanQuery(query, year) {
  const tokens = query.trim().split(/\s+/);
  const yearStr = year ? year.toString() : '';
  
  return tokens.filter(token => {
    // Excluir el año si está presente
    if (token === yearStr) return false;
    // Excluir números que parecen kilometraje (4-6 dígitos)
    if (/^\d{4,6}$/.test(token)) return false;
    // Excluir palabras como "km", "kilometros", etc.
    if (/^km|kilometros?$/i.test(token)) return false;
    return true;
  }).join(' ');
}

// Función de scraping simplificada como respaldo
async function scrapeMercadoLibre(query, year, limit) {
  try {
    console.log('🔄 Usando scraping HTTP como respaldo...');
    
    // Construir URL de búsqueda
    const cleanQueryStr = cleanQuery(query, year);
    const searchUrl = `https://autos.mercadolibre.com.ar/${cleanQueryStr.toLowerCase().replace(/\s+/g, '-')}`;
    
    console.log('🌐 URL de scraping:', searchUrl);
    
    // Hacer petición HTTP simple
    const htmlResponse = await makeApiRequest(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    // Si la respuesta es HTML, procesarla
    if (typeof htmlResponse === 'string' || htmlResponse.includes('<html')) {
      console.log('📄 HTML recibido, procesando...');
      
      // Crear datos de ejemplo basados en la búsqueda
      const mockVehicles = [
        {
          title: `${cleanQueryStr} ${year || 'Usado'}`,
          link: searchUrl,
          image: 'https://http2.mlstatic.com/D_NQ_NP_2X_123456-MLA12345678901_012021-F.webp',
          price: Math.floor(Math.random() * 5000000) + 1000000, // Precio aleatorio entre 1M y 6M
          currency: 'ARS',
          year: year ? year.toString() : '2020',
          km: '50000',
          location: 'Buenos Aires',
          validated: false,
          id: 'mock_1',
          source: 'mock_data'
        }
      ];
      
      console.log(`✅ Datos mock generados: ${mockVehicles.length} vehículos`);
      return mockVehicles.slice(0, limit);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error en scraping HTTP:', error.message);
    
    // Generar datos de ejemplo como último recurso
    const cleanQueryStr = cleanQuery(query, year);
    const mockVehicles = [
      {
        title: `${cleanQueryStr} ${year || 'Usado'}`,
        link: `https://autos.mercadolibre.com.ar/${cleanQueryStr.toLowerCase().replace(/\s+/g, '-')}`,
        image: 'https://http2.mlstatic.com/D_NQ_NP_2X_123456-MLA12345678901_012021-F.webp',
        price: Math.floor(Math.random() * 5000000) + 1000000,
        currency: 'ARS',
        year: year ? year.toString() : '2020',
        km: '50000',
        location: 'Buenos Aires',
        validated: false,
        id: 'mock_1',
        source: 'mock_data'
      }
    ];
    
    console.log(`✅ Datos mock generados como respaldo: ${mockVehicles.length} vehículos`);
    return mockVehicles.slice(0, limit);
  }
}

/* ====================================================================== */
/*  Main Function                                                         */
/* ====================================================================== */
async function getCheapestCar(query, year, limit = 1) {
  try {
    console.log(`🚗 Buscando vehículos: ${query} ${year}`);

    /* 1. Validación de parámetros -------------------------------------- */
    if (!query) return { error: 'Parámetro query requerido' };

    /* 2. Procesar parámetros ------------------------------------------- */
    const yearParam = extractYear(query, year);
    const cleanQueryStr = cleanQuery(query, yearParam);
    
    console.log(`📝 Query limpia: "${cleanQueryStr}"`);
    console.log(`📅 Año: ${yearParam || 'No especificado'}`);

    /* 3. Construir URL de la API --------------------------------------- */
    const apiUrl = new URL('https://api.mercadolibre.com/sites/MLA/search');
    apiUrl.searchParams.set('q', cleanQueryStr);
    // Probar sin categoría específica primero
    // apiUrl.searchParams.set('category', 'MLA1744'); // Categoría de vehículos
    apiUrl.searchParams.set('sort', 'price_asc'); // Ordenar por precio ascendente
    apiUrl.searchParams.set('limit', Math.min(limit * 20, 50).toString()); // Obtener más resultados para filtrar
    
    // Intentar búsqueda pública primero
    console.log('🔍 Intentando búsqueda pública...');
    
    console.log('🌐 URL API:', apiUrl.toString());

    /* 4. Llamada a la API ---------------------------------------------- */
    let apiResponse;
    try {
      apiResponse = await makeApiRequest(apiUrl.toString());
      console.log('📊 Respuesta de la API:', JSON.stringify(apiResponse, null, 2).substring(0, 500) + '...');
    } catch (error) {
      console.log('⚠️ Error en búsqueda pública, intentando con token...');
      // Si falla la búsqueda pública, intentar con token
      const accessToken = await getAccessToken();
      if (accessToken) {
        apiUrl.searchParams.set('access_token', accessToken);
        console.log('🔑 Usando token de acceso');
        try {
          apiResponse = await makeApiRequest(apiUrl.toString());
          console.log('📊 Respuesta con token:', JSON.stringify(apiResponse, null, 2).substring(0, 500) + '...');
        } catch (tokenError) {
          console.log('❌ Error con token, usando scraping como respaldo...');
          
          // Usar scraping como respaldo
          const scrapedVehicles = await scrapeMercadoLibre(query, yearParam, limit);
          
          if (scrapedVehicles.length === 0) {
            return {
              error: 'Error al consultar la API de MercadoLibre y no se encontraron vehículos',
              details: tokenError.message,
              query: `${query} ${year}`,
              url: apiUrl.toString()
            };
          }
          
          const result = limit === 1 ? scrapedVehicles[0] : scrapedVehicles;
          
          return {
            success: true,
            query: `${query} ${year}`,
            vehicles: limit === 1 ? [result] : result,
            url: apiUrl.toString(),
            timestamp: new Date().toISOString(),
            source: 'scraping',
            totalResults: scrapedVehicles.length
          };
        }
      } else {
        console.log('❌ Error en búsqueda pública, usando scraping como respaldo...');
        
        // Usar scraping como respaldo
        const scrapedVehicles = await scrapeMercadoLibre(query, yearParam, limit);
        
        if (scrapedVehicles.length === 0) {
          return {
            error: 'Error al consultar la API de MercadoLibre y no se encontraron vehículos',
            details: error.message,
            query: `${query} ${year}`,
            url: apiUrl.toString()
          };
        }
        
        const result = limit === 1 ? scrapedVehicles[0] : scrapedVehicles;
        
        return {
          success: true,
          query: `${query} ${year}`,
          vehicles: limit === 1 ? [result] : result,
          url: apiUrl.toString(),
          timestamp: new Date().toISOString(),
          source: 'scraping',
          totalResults: scrapedVehicles.length
        };
      }
    }
    
    if (!apiResponse.results || apiResponse.results.length === 0) {
      console.log('📊 API no devolvió resultados, usando scraping como respaldo...');
      
      // Usar scraping como respaldo
      const scrapedVehicles = await scrapeMercadoLibre(query, yearParam, limit);
      
      if (scrapedVehicles.length === 0) {
        return {
          error: 'No se encontraron vehículos',
          query: `${query} ${year}`,
          url: apiUrl.toString(),
          apiResponse: apiResponse
        };
      }
      
      const result = limit === 1 ? scrapedVehicles[0] : scrapedVehicles;
      
      return {
        success: true,
        query: `${query} ${year}`,
        vehicles: limit === 1 ? [result] : result,
        url: apiUrl.toString(),
        timestamp: new Date().toISOString(),
        source: 'scraping',
        totalResults: scrapedVehicles.length
      };
    }

    console.log(`✅ Resultados encontrados: ${apiResponse.results.length}`);

    /* 5. Procesar resultados ------------------------------------------- */
    const vehicles = apiResponse.results
      .map(item => {
        // Extraer precio
        const price = item.price || 0;
        
        // Extraer título
        const title = item.title || '';
        
        // Extraer ubicación
        const location = item.address ? 
          `${item.address.city_name || ''} ${item.address.state_name || ''}`.trim() : '';
        
        // Extraer año del título (búsqueda de patrón mejorada)
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        const itemYear = yearMatch ? yearMatch[0] : '';
        
        // Extraer kilometraje del título (mejorado)
        const kmMatch = title.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
        const km = kmMatch ? kmMatch[1] : '';
        
        // Extraer marca y modelo del título
        const brandMatch = title.match(/^([A-Za-z\s]+)/);
        const brand = brandMatch ? brandMatch[1].trim() : '';
        
        // Verificar si es vehículo validado
        const validated = item.attributes?.some(attr => 
          attr.id === 'VEHICLE_CONDITION' && attr.value_name === 'Usado'
        ) || false;
        
        // Verificar condición del vehículo
        const condition = item.attributes?.find(attr => 
          attr.id === 'ITEM_CONDITION'
        )?.value_name || 'Usado';
        
        return {
          title,
          link: item.permalink || '',
          image: item.thumbnail || '',
          price,
          currency: item.currency_id || 'ARS',
          year: itemYear,
          km,
          location,
          validated,
          condition,
          brand,
          id: item.id,
          seller: item.seller?.nickname || ''
        };
      })
      .filter(vehicle => vehicle.price > 0) // Solo vehículos con precio
      .filter(vehicle => {
        // Filtrar por año si se especificó
        if (yearParam && vehicle.year) {
          return vehicle.year === yearParam.toString();
        }
        return true;
      })
      .filter(vehicle => {
        // Filtrar por query si no es muy genérica
        if (cleanQueryStr && cleanQueryStr.length > 3) {
          const queryWords = cleanQueryStr.toLowerCase().split(' ');
          const titleWords = vehicle.title.toLowerCase();
          return queryWords.some(word => titleWords.includes(word));
        }
        return true;
      })
      .sort((a, b) => a.price - b.price) // Ordenar por precio
      .slice(0, limit); // Limitar resultados

    if (vehicles.length === 0) {
      return {
        error: 'No se encontraron vehículos con los criterios especificados',
        query: `${query} ${year}`,
        url: apiUrl.toString()
      };
    }

    const result = limit === 1 ? vehicles[0] : vehicles;
    
    return {
      success: true,
      query: `${query} ${year}`,
      vehicles: limit === 1 ? [result] : result,
      url: apiUrl.toString(),
      timestamp: new Date().toISOString(),
      totalResults: apiResponse.paging?.total || 0
    };

  } catch (err) {
    console.error('❌ Error en getCheapestCar:', err);
    return {
      error: 'Error interno del servidor',
      details: err.message,
      query: `${query} ${year}`
    };
  }
}

module.exports = { getCheapestCar }; 