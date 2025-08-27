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
    const stats = vehicleService.getDataStats();
    res.json({
      success: true,
      message: 'Servicio de datos de vehículos funcionando correctamente',
      data: stats
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
    const years = await vehicleService.getYears();
    
    res.json({
      success: true,
      data: years,
      source: 'static'
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
    
    const brands = await vehicleService.getBrands(year);
    
    res.json({
      success: true,
      data: brands,
      source: 'static',
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

// Obtener modelos por marca y año
router.get('/models/:year/:brandId', async (req, res) => {
  try {
    const { year, brandId } = req.params;
    console.log(`🚗 Solicitando modelos para marca ${brandId} año ${year}...`);
    
    if (!year || isNaN(year)) {
      return res.status(400).json({
        success: false,
        error: 'Año inválido'
      });
    }
    
    if (!brandId) {
      return res.status(400).json({
        success: false,
        error: 'ID de marca requerido'
      });
    }
    
    const models = await vehicleService.getModels(year, brandId);
    
    res.json({
      success: true,
      data: models,
      source: 'static',
      year: year,
      brandId: brandId
    });
  } catch (error) {
    console.error(`❌ Error obteniendo modelos para marca ${req.params.brandId} año ${req.params.year}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener versiones por modelo, marca y año
router.get('/versions/:year/:brandId/:modelId', async (req, res) => {
  try {
    const { year, brandId, modelId } = req.params;
    console.log(`🔧 Solicitando versiones para modelo ${modelId} marca ${brandId} año ${year}...`);
    
    if (!year || isNaN(year)) {
      return res.status(400).json({
        success: false,
        error: 'Año inválido'
      });
    }
    
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
    
    const versions = await vehicleService.getVersions(year, brandId, modelId);
    
    res.json({
      success: true,
      data: versions,
      source: 'static',
      year: year,
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

// Búsqueda de vehículos por texto
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query de búsqueda debe tener al menos 2 caracteres'
      });
    }
    
    console.log(`🔍 Buscando vehículos con query: "${q}"`);
    const results = await vehicleService.searchVehicles(q.trim(), parseInt(limit));
    
    res.json({
      success: true,
      data: results,
      source: 'static',
      query: q,
      total: results.length
    });
  } catch (error) {
    console.error('❌ Error en búsqueda de vehículos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas de datos disponibles
router.get('/stats', async (req, res) => {
  try {
    const stats = vehicleService.getDataStats();
    
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

// Aplicar middleware de manejo de errores
router.use(errorHandler);

module.exports = router;
