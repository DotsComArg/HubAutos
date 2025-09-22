// utils/cheapest-car.js
//
//  ➜   GET /api/cheapest-car?q=toyota corolla 100000 km&year=2024&limit=1
//  ➜   Usa Apify Actor para scraping de MercadoLibre
// ------------------------------------------------------------------------

const dotenv    = require('dotenv');
dotenv.config();

const { ApifyService } = require('./apifyService');
let url = '';

/* ----------  Configuración  ---------- */
const apifyService = new ApifyService();

/* ====================================================================== */
/*  Main Function                                                         */
/* ====================================================================== */
async function getCheapestCar(query, year, limit = 1) {
  try {
    console.log(`🚗 Buscando vehículos con Apify: ${query} ${year}`);

    /* 1. Validar parámetros -------------------------------------------- */
    if (!query) return { error: 'Parametro query requerido' };

    /* 2. Usar solo Apify ----------------------------------------------- */
    console.log('🚀 Ejecutando búsqueda con Apify Actor...');
    
    const apifyResult = await apifyService.searchVehicles(query, year, limit);
    
    if (apifyResult.success) {
      console.log('✅ Apify ejecutado correctamente');
      return apifyResult;
    } else {
      console.log('❌ Apify falló:', apifyResult.error);
      return {
        error: `Error en Apify: ${apifyResult.error}`,
        query: `${query} ${year}`,
        timestamp: new Date().toISOString()
      };
    }

  } catch (err) {
    console.error('❌ Error crítico en getCheapestCar:', err);
    
    // Determinar el tipo de error específico de Apify
    let errorMessage = 'Error interno del servidor';
    if (err.message.includes('timeout')) {
      errorMessage = 'Timeout: El Actor de Apify tardó demasiado en responder';
    } else if (err.message.includes('Unauthorized') || err.message.includes('401')) {
      errorMessage = 'Error de autenticación: Verificar API key de Apify';
    } else if (err.message.includes('Actor not found') || err.message.includes('404')) {
      errorMessage = 'Error: Actor de Apify no encontrado';
    } else if (err.message.includes('network') || err.message.includes('ECONNREFUSED')) {
      errorMessage = 'Error de red: No se pudo conectar con Apify';
    }
    
    return {
      error: errorMessage,
      details: err.message,
      query: `${query} ${year}`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { getCheapestCar }; 