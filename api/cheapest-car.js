// api/cheapest-car.js
//
//  ➜   GET /api/cheapest-car?q=toyota corolla 100000 km&year=2024&limit=1
//  ➜   Requiere:  npm i puppeteer-core@24.2.0 @sparticuz/chromium-min@124
// ------------------------------------------------------------------------

const { getCheapestCar } = require('../utils/cheapest-car.js');

/* ====================================================================== */
/*  Handler                                                               */
/* ====================================================================== */
module.exports = async (data) => {
  try {
    /* 1. Parámetros ----------------------------------------------------- */
    const {
      q,
      year: yearParam,
      limit = 5,
      usedOnly = true,
      province = ""
    } = data;

    if (!q) return { error: 'Parametro ?q requerido' };

    /* 2. Procesar año --------------------------------------------------- */
    let year = null;
    if (yearParam && /^\d{4}$/.test(yearParam)) {
      year = yearParam;
    } else {
      // Buscar año en la query
      const tokens = q.trim().split(/\s+/);
      for (const tok of tokens) {
        if (/^\d{4}$/.test(tok) && tok >= 1900 && tok <= 2099) {
          year = tok;
          break;
        }
      }
    }

    /* 3. Llamar a la función de scraping ------------------------------- */
    console.log(`Buscando: ${q}, año: ${year}, límite: ${limit}`);
    
    const result = await getCheapestCar(q, year, limit);
    
    if (result.error) {
      return { error: result.error };
    }
    
    /* 4. Formatear respuesta --------------------------------------------- */
    const response = {
      query: q,
      year: year,
      result: result,
      timestamp: new Date().toISOString()
    };
    
    return response;

  } catch (err) {
    console.error('Error en cheapest-car API:', err);
    
    // Determinar el tipo de error
    let errorMessage = 'Error interno del servidor';
    if (err.name === 'TimeoutError') {
      errorMessage = 'Timeout: La página no cargó completamente';
    } else if (err.message.includes('selector')) {
      errorMessage = 'Error de selector: No se encontraron elementos en la página';
    } else if (err.message.includes('net::')) {
      errorMessage = 'Error de red: No se pudo conectar a MercadoLibre';
    }
    
    return { 
      error: errorMessage, 
      details: err.message,
      stack: err.stack 
    };
  }
};
