// utils/apifyService.js
// Servicio para integración con Apify Actor

const axios = require('axios');

class ApifyService {
  constructor() {
    this.apiKey = process.env.APIFY_API_KEY;
    this.actorId = 'trudax~mercadolibre-scraper';
    this.baseUrl = 'https://api.apify.com/v2';
  }

  async runActor(input, options = {}) {
    try {
      console.log('🚀 Iniciando Actor de Apify...');
      
      // Configuración por defecto
      const defaultInput = {
        startUrls: [],
        maxItems: 50,
        ...input
      };

      const runOptions = {
        timeout: 600, // 10 minutos
        memory: 2048,
        ...options
      };

      console.log('📋 Configuración del Actor:', {
        input: defaultInput,
        timeout: runOptions.timeout,
        memory: runOptions.memory
      });

      // Iniciar el actor
      const runResponse = await axios.post(
        `${this.baseUrl}/acts/${this.actorId}/runs`,
        {
          input: defaultInput,
          ...runOptions
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos para iniciar el run
        }
      );

      if (!runResponse.data || !runResponse.data.data || !runResponse.data.data.id) {
        throw new Error('Respuesta inválida de Apify al iniciar el run');
      }

      const runId = runResponse.data.data.id;
      console.log(`📊 Run iniciado con ID: ${runId}`);

      // Esperar a que termine el run
      return await this.waitForRunCompletion(runId);

    } catch (error) {
      console.error('❌ Error ejecutando Actor de Apify:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Error de autenticación: API key de Apify inválida');
      } else if (error.response?.status === 404) {
        throw new Error('Actor de Apify no encontrado');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Error de red: No se pudo conectar con Apify');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout al conectar con Apify');
      }
      
      throw error;
    }
  }

  async waitForRunCompletion(runId, maxWaitTime = 600000) { // 10 minutos máximo
    const startTime = Date.now();
    let lastStatus = '';
    
    console.log(`⏳ Esperando que termine el run ${runId}...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const statusResponse = await axios.get(
          `${this.baseUrl}/actor-runs/${runId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: 15000
          }
        );

        if (!statusResponse.data || !statusResponse.data.data) {
          throw new Error('Respuesta inválida al verificar estado del run');
        }

        const status = statusResponse.data.data.status;
        
        // Solo loggear si el estado cambió
        if (status !== lastStatus) {
          console.log(`⏳ Estado del run: ${status}`);
          lastStatus = status;
        }

        if (status === 'SUCCEEDED') {
          console.log('✅ Run completado exitosamente');
          return await this.getRunResults(runId);
        } else if (status === 'FAILED') {
          const errorMessage = statusResponse.data.data.stats?.errorMessages?.[0] || 'Error desconocido';
          throw new Error(`Run falló: ${errorMessage}`);
        } else if (status === 'ABORTED') {
          throw new Error('Run fue abortado');
        } else if (status === 'TIMED-OUT') {
          throw new Error('Run excedió el tiempo límite');
        } else if (status === 'RUNNING' || status === 'READY') {
          // Continuar esperando
        } else {
          console.log(`⚠️ Estado inesperado: ${status}`);
        }

        // Esperar 15 segundos antes del siguiente check
        await new Promise(resolve => setTimeout(resolve, 15000));

      } catch (error) {
        if (error.message.includes('Run falló') || error.message.includes('Run fue abortado') || error.message.includes('Run excedió')) {
          throw error; // Re-lanzar errores específicos del run
        }
        console.error('❌ Error verificando estado del run:', error.message);
        
        // Si es un error de red, esperar un poco más y reintentar
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNABORTED') {
          console.log('🔄 Error de red, reintentando en 30 segundos...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          continue;
        }
        
        throw error;
      }
    }

    throw new Error('Timeout: El run de Apify tardó demasiado en completarse');
  }

  async getRunResults(runId) {
    try {
      const resultsResponse = await axios.get(
        `${this.baseUrl}/actor-runs/${runId}/dataset/items`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      console.log(`✅ Resultados obtenidos: ${resultsResponse.data.length} items`);
      return resultsResponse.data;

    } catch (error) {
      console.error('❌ Error obteniendo resultados:', error.response?.data || error.message);
      throw error;
    }
  }

  async runActorSync(input, options = {}) {
    try {
      console.log('🚀 Ejecutando Actor de Apify síncronamente...');
      
      // Configuración por defecto - NO agregar startUrls ni maxItems si se usa search
      const defaultInput = input.search ? {
        // Si usa search, no agregar startUrls ni maxItems
        ...input
      } : {
        // Si usa startUrls, agregar defaults
        startUrls: [],
        maxItems: 15,
        ...input
      };

      const runOptions = {
        timeout: 300, // 300 segundos (5 minutos) para dar más tiempo al scraper
        memory: 2048,
        ...options
      };

      console.log('📋 Configuración del Actor:', {
        input: defaultInput,
        timeout: runOptions.timeout,
        memory: runOptions.memory
      });

      // Usar el endpoint síncrono que devuelve directamente los dataset items
      const response = await axios.post(
        `${this.baseUrl}/acts/${this.actorId}/run-sync-get-dataset-items?token=${this.apiKey}`,
        defaultInput,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 300 segundos (5 minutos) timeout para dar más tiempo
        }
      );

      console.log(`✅ Actor ejecutado síncronamente: ${response.data.length} items`);
      return response.data;

    } catch (error) {
      console.error('❌ Error ejecutando Actor síncrono:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Error de autenticación: API key de Apify inválida');
      } else if (error.response?.status === 404) {
        throw new Error('Actor de Apify no encontrado');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Error de red: No se pudo conectar con Apify');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout al conectar con Apify');
      }
      
      throw error;
    }
  }

  async searchVehicles(query, year, limit = 1) {
    try {
      console.log(`🚗 Buscando vehículos en Apify: ${query} ${year}`);

      // Construir URL de búsqueda para MercadoLibre
      const tokens = query.trim().split(/\s+/);
      let yearParam = null;

      if (year && /^\d{4}$/.test(year)) {
        yearParam = year;
      } else {
        for (const tok of tokens)
          if (/^\d{4}$/.test(tok) && tok >= 1900 && tok <= 2099) { 
            yearParam = tok; 
            break; 
          }
      }

      // Filtrar el kilometraje de la búsqueda
      const words = yearParam ? tokens.filter(t => t !== yearParam.toString()) : tokens;
      const filteredWords = words.filter(word => {
        if (/^\d{4,6}$/.test(word)) return false;
        if (/^km|kilometros?$/i.test(word)) return false;
        return true;
      });
      
      // Limpiar y formatear el query para Apify (mantener espacios, sin caracteres especiales)
      let searchQuery = filteredWords.join(' ')
        .toLowerCase()
        .replace(/[.,\/\\]/g, '') // Eliminar puntos, comas y barras
        .replace(/[^\w\s]/g, '')  // Eliminar caracteres especiales pero mantener espacios
        .replace(/\s+/g, ' ')     // Normalizar espacios múltiples a uno solo
        .trim();                  // Eliminar espacios al inicio/final
      
      // Agregar el año al query si está disponible
      if (yearParam) {
        searchQuery = `${searchQuery} ${yearParam}`;
      }
      const slug = searchQuery.replace(/\s+/g, '-');
      
      console.log('🔍 Query de búsqueda para Apify:', searchQuery);

      // Construir input EXACTO como en la web de Apify
      const apifyInput = {
        // Orden EXACTO como en la web de Apify
        debugMode: false,
        domainCode: "AR",
        fastMode: false,
        maxItemCount: 3,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        },
        search: searchQuery,
        sortBy: "relevance"
      };

      console.log('📤 Input enviado a Apify:', JSON.stringify(apifyInput, null, 2));

      // Usar el endpoint síncrono con search directo (EXACTO como funciona en Apify web)
      const results = await this.runActorSync(apifyInput);

      // Procesar resultados
      const processedResults = this.processVehicleResults(results, limit);
      
      return {
        success: true,
        query: `${query} ${year}`,
        vehicles: processedResults,
        searchQuery: searchQuery,
        timestamp: new Date().toISOString(),
        source: 'apify'
      };

    } catch (error) {
      console.error('❌ Error en searchVehicles de Apify:', error.message);
      return {
        error: 'Error en el scraper de Apify',
        details: error.message,
        query: `${query} ${year}`
      };
    }
  }

  processVehicleResults(results, limit) {
    if (!results || !Array.isArray(results)) {
      return [];
    }

    const toNumber = txt => {
      const m = (txt || '').match(/\d[\d.]*/);
      return m ? +m[0].replace(/\./g, '') : null;
    };

    const extractYearAndKm = (subtitle) => {
      if (!subtitle) return { year: '', km: '' };
      
      // Formato típico: "2019 | 70.286 km · Publicado hace 8 días"
      const yearMatch = subtitle.match(/(\d{4})/);
      const kmMatch = subtitle.match(/([\d.,]+)\s*km/i);
      
      return {
        year: yearMatch ? yearMatch[1] : '',
        km: kmMatch ? kmMatch[1].replace(/\./g, '') : ''
      };
    };

    // Función para verificar si es un auto completo (no repuesto/accesorio)
    const isCompleteVehicle = (title, subtitle) => {
      const titleLower = title.toLowerCase();
      const subtitleLower = subtitle ? subtitle.toLowerCase() : '';
      
      // Palabras que indican repuestos/accesorios
      const partsKeywords = [
        'repuesto', 'accesorio', 'faro', 'paragolpe', 'protector', 'emblema', 
        'filtro', 'kit', 'moldura', 'tapa', 'baul', 'trasero', 'delantero',
        'puerta', 'vidrio', 'espejo', 'neumatico', 'llanta', 'motor',
        'bateria', 'aceite', 'frenos', 'amortiguador', 'radiador'
      ];
      
      // Palabras que indican auto completo
      const vehicleKeywords = [
        'km', 'kilometros', 'año', 'automatica', 'manual', 'usado', 'nuevo',
        'puertas', 'ptas', 'motor', 'cilindros', 'turbo', 'gasolina', 'nafta'
      ];
      
      // Si contiene palabras de repuestos, probablemente no es un auto completo
      const hasPartsKeywords = partsKeywords.some(keyword => 
        titleLower.includes(keyword)
      );
      
      // Si contiene palabras de vehículo completo, probablemente sí es un auto
      const hasVehicleKeywords = vehicleKeywords.some(keyword => 
        titleLower.includes(keyword) || subtitleLower.includes(keyword)
      );
      
      // Es un auto si no tiene palabras de repuestos (relajar filtro temporalmente)
      // return !hasPartsKeywords && hasVehicleKeywords;
      return !hasPartsKeywords; // Solo filtrar repuestos, no exigir palabras de vehículo
    };

    console.log(`📊 Total resultados de Apify: ${results.length}`);
    
    const processedVehicles = results
      .filter(item => {
        // Filtrar solo autos completos, no repuestos
        const isVehicle = isCompleteVehicle(item.title, item.subtitle);
        if (!isVehicle) {
          console.log(`🚫 Filtrado (repuesto): ${item.title}`);
        } else {
          console.log(`✅ Aceptado (auto): ${item.title}`);
        }
        return isVehicle;
      })
      .map(item => {
        // Mapear los campos del resultado de Apify a nuestro formato
        const title = item.title || '';
        const link = item.url || '';
        const image = item.images && item.images.length > 0 ? item.images[0] : '';
        const price = toNumber(item.price || '');
        const currency = item.currency === 'ARS' ? '$' : item.currency || '$';
        const { year, km } = extractYearAndKm(item.subtitle);
        const location = ''; // No disponible en los datos de Apify
        const validated = item.condition === 'Used' ? false : true;

        return {
          title,
          link,
          image,
          price,
          currency,
          year,
          km,
          location,
          validated
        };
      })
      .filter(vehicle => vehicle.title && vehicle.price)
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);

    return limit === 1 ? processedVehicles[0] : processedVehicles;
  }
}

module.exports = { ApifyService };
