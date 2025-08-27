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
    console.log('📅 Solicitando años disponibles...');
    
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

// Obtener marcas por año
router.get('/brands/:year', async (req, res) => {
  try {
    const { year } = req.params;
    console.log(`🏷️ Solicitando marcas para año ${year}...`);
    
    if (!year || isNaN(year)) {
      return res.status(400).json({
        success: false,
        error: 'Año inválido'
      });
    }
    
    // Refrescar tokens si es necesario
    await vehicleService.refreshTokensIfNeeded();
    
    const brands = await vehicleService.getBrands(year);
    
    res.json({
      success: true,
      data: brands,
      source: 'infoautos',
      year: year
    });
  } catch (error) {
    console.error(`❌ Error obteniendo marcas para año ${req.params.year}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener modelos por marca (sin filtrar por año)
router.get('/brands/:brandId/models', async (req, res) => {
  try {
    const { brandId } = req.params;
    
    console.log(`🚗 Solicitando TODOS los modelos para marca ${brandId}...`);
    
    if (!brandId) {
      return res.status(400).json({
        success: false,
        error: 'ID de marca requerido'
      });
    }
    
    // Refrescar tokens si es necesario
    await vehicleService.refreshTokensIfNeeded();
    
    // Obtener todos los modelos de la marca sin filtrar por año
    const models = await vehicleService.getAllModelsForBrand(brandId);
    
    res.json({
      success: true,
      data: models,
      source: 'infoautos',
      brandId: brandId
    });
  } catch (error) {
    console.error(`❌ Error obteniendo modelos para marca ${req.params.brandId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener versiones por modelo y marca (sin filtrar por año)
router.get('/brands/:brandId/models/:modelId/versions', async (req, res) => {
  try {
    const { brandId, modelId } = req.params;
    
    console.log(`🔧 Solicitando TODAS las versiones para modelo ${modelId} marca ${brandId}...`);
    
    if (!brandId) {
      return res.status(400).json({
        success: false,
        error: 'ID de marca requerido'
      });
    }
    
    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'ID de modelo requerido'
      });
    }
    
    // Refrescar tokens si es necesario
    await vehicleService.refreshTokensIfNeeded();
    
    // Obtener todas las versiones del modelo sin filtrar por año
    const versions = await vehicleService.getVersions(brandId, modelId);
    
    res.json({
      success: true,
      data: versions,
      source: 'infoautos',
      brandId: brandId,
      modelId: modelId
    });
  } catch (error) {
    console.error(`❌ Error obteniendo versiones para modelo ${req.params.modelId}:`, error);
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
