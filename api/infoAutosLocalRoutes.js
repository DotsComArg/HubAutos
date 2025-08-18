const express = require('express');
const router = express.Router();
const InfoAuto = require('../models/InfoAuto');

// GET /api/infoautos-local/years - Obtener años disponibles desde MongoDB
router.get('/years', async (req, res) => {
    try {
        const years = await InfoAuto.getYears();
        const formattedYears = years.map(year => ({
            id: year,
            name: year.toString()
        }));
        
        res.json({
            success: true,
            data: formattedYears
        });
    } catch (error) {
        console.error('Error obteniendo años desde MongoDB:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/infoautos-local/brands/:year - Obtener marcas por año desde MongoDB
router.get('/brands/:year', async (req, res) => {
    try {
        const { year } = req.params;
        const brands = await InfoAuto.getBrands(parseInt(year));
        
        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        console.error('Error obteniendo marcas desde MongoDB:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/infoautos-local/models/:year/:brandId - Obtener modelos por marca y año desde MongoDB
router.get('/models/:year/:brandId', async (req, res) => {
    try {
        const { year, brandId } = req.params;
        const models = await InfoAuto.getModels(parseInt(year), brandId);
        
        res.json({
            success: true,
            data: models
        });
    } catch (error) {
        console.error('Error obteniendo modelos desde MongoDB:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/infoautos-local/versions/:year/:brandId/:modelId - Obtener versiones por modelo, marca y año desde MongoDB
router.get('/versions/:year/:brandId/:modelId', async (req, res) => {
    try {
        const { year, brandId, modelId } = req.params;
        const versions = await InfoAuto.getVersions(parseInt(year), brandId, modelId);
        
        res.json({
            success: true,
            data: versions
        });
    } catch (error) {
        console.error('Error obteniendo versiones desde MongoDB:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/infoautos-local/vehicle/:year/:brandId/:modelId/:versionId? - Obtener datos completos del vehículo desde MongoDB
router.get('/vehicle/:year/:brandId/:modelId/:versionId?', async (req, res) => {
    try {
        const { year, brandId, modelId, versionId } = req.params;
        const vehicle = await InfoAuto.getVehicle(parseInt(year), brandId, modelId, versionId);
        
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehículo no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: vehicle
        });
    } catch (error) {
        console.error('Error obteniendo vehículo desde MongoDB:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/infoautos-local/stats - Obtener estadísticas de sincronización
router.get('/stats', async (req, res) => {
    try {
        const totalVehicles = await InfoAuto.countDocuments();
        const lastSync = await InfoAuto.findOne().sort({ lastSync: -1 }).select('lastSync');
        const yearsCount = await InfoAuto.distinct('year').length;
        const brandsCount = await InfoAuto.distinct('brand.id').length;
        
        res.json({
            success: true,
            data: {
                totalVehicles,
                lastSync: lastSync?.lastSync,
                yearsCount,
                brandsCount
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// POST /api/infoautos-local/sync - Iniciar sincronización manual
router.post('/sync', async (req, res) => {
    try {
        const { year } = req.body;
        const InfoAutosETL = require('../services/infoAutosETL');
        const etl = new InfoAutosETL();
        
        if (year) {
            const result = await etl.syncYear(parseInt(year));
            res.json({
                success: true,
                message: `Sincronización del año ${year} completada`,
                data: result
            });
        } else {
            const result = await etl.syncAllData();
            res.json({
                success: true,
                message: 'Sincronización completa completada',
                data: result
            });
        }
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.status(500).json({
            success: false,
            error: 'Error en sincronización'
        });
    }
});

module.exports = router;
