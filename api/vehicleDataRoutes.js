const express = require('express');
const VehicleDataService = require('../services/vehicleDataService');

const router = express.Router();
const vehicleService = new VehicleDataService();

// Middleware para manejar errores
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error en Vehicle Data API:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
};

// Endpoint de prueba de conexión
router.get('/health', async (req, res) => {
  try {
    const connection = await vehicleService.checkConnection();
    const tokenStats = vehicleService.getTokenStats();
    const fallbackStatus = vehicleService.isUsingFallbackForYears();
    
    res.json({
      success: true,
      message: 'Servicio de datos de vehículos funcionando correctamente',
      data: {
        connection,
        tokenStats,
        fallbackStatus: {
          usingFallbackForYears: fallbackStatus,
          message: fallbackStatus ? 'Usando datos de fallback para años' : 'Usando Info Autos para años'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener años disponibles
router.get('/years', async (req, res) => {
  try {
    
    // Refrescar tokens si es necesario
    await vehicleService.refreshTokensIfNeeded();
    
    const years = await vehicleService.getYears();
    
    res.json({
      success: true,
      data: years,
      source: 'infoautos'
    });
  } catch (error) {
    console.error('❌ Error obteniendo años:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener TODAS las marcas disponibles (sin filtrar por año)
router.get('/brands', async (req, res) => {
  try {
    console.log(`🏷️ Solicitando TODAS las marcas disponibles...`);
    
    // Refrescar tokens si es necesario
    await vehicleService.refreshTokensIfNeeded();
    
    // Obtener todas las marcas sin filtrar por año
    const brands = await vehicleService.getAllBrands();
    
    res.json({
      success: true,
      data: brands,
      source: 'infoautos'
    });
  } catch (error) {
    console.error(`❌ Error obteniendo todas las marcas:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener modelos de una marca filtrados por año
router.get('/brands/:brandId/models', async (req, res) => {
  try {
    const { brandId } = req.params;
    const { year } = req.query;
    
    console.log(`🚗 Solicitando modelos para marca ${brandId} año ${year}...`);
    
    if (!brandId) {
      return res.status(400).json({
        success: false,
        error: 'ID de marca requerido'
      });
    }
    
    if (!year) {
      return res.status(400).json({
        success: false,
        error: 'Año requerido'
      });
    }
    
    // Refrescar tokens si es necesario
    await vehicleService.refreshTokensIfNeeded();
    
    // Obtener TODOS los modelos de la marca
    const allModels = await vehicleService.getAllModelsForBrand(brandId);
    
    console.log(`📊 Total de modelos obtenidos para marca ${brandId}: ${allModels.length}`);
    
    // Filtrar modelos por año usando múltiples criterios
    const filteredModels = allModels.filter(model => {
      // Criterio 1: Verificar si tiene rango de precios que incluya el año
      if (model.prices_from && model.prices_to) {
        const yearInt = parseInt(year);
        const fromYear = parseInt(model.prices_from);
        const toYear = parseInt(model.prices_to);
        
        if (yearInt >= fromYear && yearInt <= toYear) {
          console.log(`✅ Modelo ${model.name} incluido por rango de precios: ${fromYear}-${toYear}`);
          return true;
        }
      }
      
      // Criterio 2: Verificar si la descripción menciona el año
      if (model.description && model.description.includes(year.toString())) {
        console.log(`✅ Modelo ${model.name} incluido por descripción que menciona ${year}`);
        return true;
      }
      
      // Criterio 3: Si no tiene información de precios pero tiene otras características
      if (!model.prices_from && !model.prices_to && model.prices === true) {
        console.log(`⚠️ Modelo ${model.name} sin rango específico pero tiene precios`);
        return true;
      }
      
      console.log(`❌ Modelo ${model.name} excluido - no cumple criterios para año ${year}`);
      return false;
    });
    
    console.log(`✅ Modelos filtrados: ${filteredModels.length} de ${allModels.length} totales para año ${year}`);
    
    // Si no hay modelos filtrados, intentar con una consulta directa usando price_at
    if (filteredModels.length === 0) {
      console.log(`🔄 No se encontraron modelos con filtrado local, intentando consulta directa con price_at=${year}...`);
      
      try {
        const directModels = await vehicleService.getModelsDirectWithPriceAt(brandId, year);
        if (directModels && directModels.length > 0) {
          console.log(`✅ Consulta directa exitosa: ${directModels.length} modelos encontrados`);
          return res.json({
            success: true,
            data: directModels,
            source: 'infoautos',
            brandId: brandId,
            year: year,
            totalModels: allModels.length,
            filteredModels: directModels.length,
            method: 'direct_query'
          });
        }
      } catch (directError) {
        console.log(`⚠️ Consulta directa falló:`, directError.message);
      }
    }
    
    res.json({
      success: true,
      data: filteredModels,
      source: 'infoautos',
      brandId: brandId,
      year: year,
      totalModels: allModels.length,
      filteredModels: filteredModels.length,
      method: 'local_filter'
    });
  } catch (error) {
    console.error(`❌ Error obteniendo modelos para marca ${req.params.brandId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener versiones de un grupo de modelo filtradas por año
router.get('/brands/:brandId/groups/:groupId/models', async (req, res) => {
  try {
    const { brandId, groupId } = req.params;
    const { year } = req.query;
    
    console.log(`🔧 Solicitando versiones para grupo ${groupId} de marca ${brandId} año ${year}...`);
    
    if (!brandId) {
      return res.status(400).json({
        success: false,
        error: 'ID de marca requerido'
      });
    }
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'ID de grupo requerido'
      });
    }
    
    if (!year) {
      return res.status(400).json({
        success: false,
        error: 'Año requerido'
      });
    }
    
    // Refrescar tokens si es necesario
    await vehicleService.refreshTokensIfNeeded();
    
    // Obtener TODAS las versiones del grupo
    const allVersions = await vehicleService.getAllVersionsForGroup(brandId, groupId);
    
    // Filtrar versiones por año (price_from <= year <= price_to)
    const filteredVersions = allVersions.filter(version => {
      if (version.prices_from && version.prices_to) {
        return version.prices_from <= parseInt(year) && parseInt(year) <= version.prices_to;
      }
      return false; // Si no tiene rango de precios, no mostrar
    });
    
    console.log(`✅ Versiones filtradas: ${filteredVersions.length} de ${allVersions.length} totales para año ${year}`);
    
    res.json({
      success: true,
      data: filteredVersions,
      source: 'infoautos',
      brandId: brandId,
      groupId: groupId,
      year: year,
      totalVersions: allVersions.length,
      filteredVersions: filteredVersions.length
    });
  } catch (error) {
    console.error(`❌ Error obteniendo versiones para grupo ${req.params.groupId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas de tokens
router.get('/stats', async (req, res) => {
  try {
    const stats = vehicleService.getTokenStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Forzar refresh de tokens
router.post('/refresh-tokens', async (req, res) => {
  try {
    await vehicleService.refreshTokensIfNeeded();
    const stats = vehicleService.getTokenStats();
    
    res.json({
      success: true,
      message: 'Tokens refrescados correctamente',
      data: stats
    });
  } catch (error) {
    console.error('❌ Error refrescando tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Forzar uso de fallback
router.post('/force-fallback', async (req, res) => {
  try {
    vehicleService.forceFallback();
    
    res.json({
      success: true,
      message: 'Fallback forzado correctamente',
      data: {
        isUsingFallback: true
      }
    });
  } catch (error) {
    console.error('❌ Error forzando fallback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Forzar uso de fallback para años
router.post('/force-fallback-years', async (req, res) => {
  try {
    vehicleService.forceFallbackForYears();
    const fallbackStatus = vehicleService.isUsingFallbackForYears();
    
    res.json({
      success: true,
      message: 'Fallback para años activado',
      data: {
        fallbackStatus: {
          usingFallbackForYears: fallbackStatus,
          message: fallbackStatus ? 'Usando datos de fallback para años' : 'Usando Info Autos para años'
        }
      }
    });
  } catch (error) {
    console.error('❌ Error forzando fallback para años:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ver estado del sistema
router.get('/status', async (req, res) => {
  try {
    const isUsingFallback = vehicleService.isUsingFallback();
    const tokenStats = vehicleService.getTokenStats();
    
    res.json({
      success: true,
      data: {
        isUsingFallback,
        fallbackEnabled: isUsingFallback,
        tokenStats,
        message: isUsingFallback ? 
          'Sistema usando datos de fallback' : 
          'Sistema usando API de Info Autos'
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Aplicar middleware de manejo de errores
router.use(errorHandler);

module.exports = router;
