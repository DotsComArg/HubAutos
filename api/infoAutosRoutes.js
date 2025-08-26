const express = require('express');
const InfoAutosApi = require('../classes/infoAutosApi');
const config = require('../config/infoAutos');

const router = express.Router();

// Instancia de la API de Info Autos
const infoAutosApi = new InfoAutosApi();

// Inicializar la API con los tokens de configuración
infoAutosApi.setTokens(config.ACCESS_TOKEN, config.REFRESH_TOKEN);

// Middleware para manejar errores
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error en Info Autos API:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
};

// Endpoint de prueba de conexión
router.get('/health', async (req, res) => {
  try {
    const result = await infoAutosApi.checkConnection();
    res.json(result);
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
    const years = await infoAutosApi.getYears();
    
    res.json({
      success: true,
      data: years
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
    
    const brands = await infoAutosApi.getBrands(year);
    
    res.json({
      success: true,
      data: brands
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
    
    const models = await infoAutosApi.getModels(year, brandId);
    
    res.json({
      success: true,
      data: models
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
    
    const versions = await infoAutosApi.getVersions(year, brandId, modelId);
    
    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    console.error(`❌ Error obteniendo versiones para modelo ${req.params.modelId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para actualizar tokens (útil para cuando se refresquen)
router.post('/tokens', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;
    
    if (!access_token || !refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Access token y refresh token son requeridos'
      });
    }
    
    infoAutosApi.setTokens(access_token, refresh_token);
    
    res.json({
      success: true,
      message: 'Tokens actualizados correctamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Aplicar middleware de manejo de errores
router.use(errorHandler);

module.exports = router;
