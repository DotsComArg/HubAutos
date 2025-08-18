const express = require('express');
const router = express.Router();
const InfoAutosService = require('../classes/infoAutosService');
require('dotenv').config();

const infoAutosService = new InfoAutosService();

// Inicializar el servicio con las credenciales
infoAutosService.initialize(
    process.env.INFOAUTOS_ACCESS_TOKEN,
    process.env.INFOAUTOS_REFRESH_TOKEN
);

// Middleware para manejo de errores
const errorHandler = (err, req, res, next) => {
    console.error('Error en Info Autos API:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Error interno del servidor'
    });
};

// GET /api/infoautos/years - Obtener años disponibles
router.get('/years', async (req, res, next) => {
    try {
        const years = await infoAutosService.getYears();
        res.json({
            success: true,
            data: years
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/infoautos/brands/:year - Obtener marcas por año
router.get('/brands/:year', async (req, res, next) => {
    try {
        const { year } = req.params;
        const brands = await infoAutosService.getBrands(year);
        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/infoautos/models/:year/:brandId - Obtener modelos por marca y año
router.get('/models/:year/:brandId', async (req, res, next) => {
    try {
        const { year, brandId } = req.params;
        const models = await infoAutosService.getModels(year, brandId);
        res.json({
            success: true,
            data: models
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/infoautos/versions/:year/:brandId/:modelId - Obtener versiones por modelo, marca y año
router.get('/versions/:year/:brandId/:modelId', async (req, res, next) => {
    try {
        const { year, brandId, modelId } = req.params;
        const versions = await infoAutosService.getVersions(year, brandId, modelId);
        res.json({
            success: true,
            data: versions
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/infoautos/vehicle/:year/:brandId/:modelId/:versionId? - Obtener datos completos del vehículo
router.get('/vehicle/:year/:brandId/:modelId/:versionId?', async (req, res, next) => {
    try {
        const { year, brandId, modelId, versionId } = req.params;
        const vehicleData = await infoAutosService.getVehicleData(year, brandId, modelId, versionId);
        res.json({
            success: true,
            data: vehicleData
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/infoautos/search - Búsqueda de vehículos
router.get('/search', async (req, res, next) => {
    try {
        const { q, year } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'El parámetro de búsqueda "q" es requerido'
            });
        }

        const results = await infoAutosService.searchVehicle(q, year);
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/infoautos/validate - Validar datos del vehículo
router.post('/validate', async (req, res, next) => {
    try {
        const { year, brandId, modelId, versionId } = req.body;
        const validation = infoAutosService.validateVehicleData(year, brandId, modelId, versionId);
        
        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/infoautos/cache/clear - Limpiar cache
router.post('/cache/clear', async (req, res, next) => {
    try {
        infoAutosService.clearCache();
        res.json({
            success: true,
            message: 'Cache limpiado exitosamente'
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/infoautos/health - Health check
router.get('/health', async (req, res) => {
    try {
        // Intentar obtener años para verificar que la API funciona
        await infoAutosService.getYears();
        res.json({
            success: true,
            message: 'Info Autos API funcionando correctamente',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Info Autos API no disponible',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para actualizar tokens manualmente
router.post('/update-tokens', async (req, res) => {
    try {
        const { accessToken, refreshToken } = req.body;
        
        if (!accessToken || !refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren accessToken y refreshToken'
            });
        }

        // Actualizar tokens en el servicio
        infoAutosService.initialize(accessToken, refreshToken);
        
        res.json({
            success: true,
            message: 'Tokens actualizados correctamente'
        });
    } catch (error) {
        console.error('Error actualizando tokens:', error.message);
        res.status(500).json({
            success: false,
            error: `Error actualizando tokens: ${error.message}`
        });
    }
});

// Aplicar middleware de manejo de errores
router.use(errorHandler);

module.exports = router;
