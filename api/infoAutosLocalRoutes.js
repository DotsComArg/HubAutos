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

// GET /api/infoautos-local/status - Obtener estado del servicio de sincronización
router.get('/status', async (req, res) => {
    try {
        const AutoSyncService = require('../services/autoSyncService');
        const autoSync = new AutoSyncService();
        
        const status = autoSync.getStatus();
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error obteniendo estado del servicio:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/infoautos-local/sync - Endpoint web para sincronización manual
router.get('/sync', async (req, res) => {
    try {
        const { year } = req.query;
        const InfoAutosETL = require('../services/infoAutosETL');
        const etl = new InfoAutosETL();
        
        let result;
        if (year) {
            result = await etl.syncYear(parseInt(year));
        } else {
            result = await etl.syncAllData();
        }
        
        // Respuesta HTML para el navegador
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sincronización Info Autos</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .success { color: #28a745; background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .info { color: #17a2b8; background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
                    .btn:hover { background: #0056b3; }
                    .stats { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚗 Sincronización Info Autos</h1>
                    
                    <div class="success">
                        <h3>✅ Sincronización Completada</h3>
                        <p><strong>Mensaje:</strong> ${year ? `Sincronización del año ${year}` : 'Sincronización completa'}</p>
                        <p><strong>Total de vehículos:</strong> ${result.totalVehicles}</p>
                    </div>
                    
                    <div class="info">
                        <h3>📊 Acciones Disponibles</h3>
                        <a href="/api/infoautos-local/sync" class="btn">🔄 Sincronización Completa</a>
                        <a href="/api/infoautos-local/sync?year=2024" class="btn">📅 Solo 2024</a>
                        <a href="/api/infoautos-local/sync?year=2023" class="btn">📅 Solo 2023</a>
                        <a href="/api/infoautos-local/stats" class="btn">📈 Ver Estadísticas</a>
                        <a href="/api/infoautos-local/years" class="btn">📋 Ver Años</a>
                    </div>
                    
                    <div class="stats">
                        <h3>📈 Próxima Sincronización Automática</h3>
                        <p><strong>Horario:</strong> Todos los días a las 10:00 AM (hora Argentina)</p>
                        <p><strong>Estado:</strong> Programada y activa</p>
                    </div>
                    
                    <p><em>Última actualización: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</em></p>
                </div>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.setHeader('Content-Type', 'text/html');
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - Sincronización Info Autos</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .error { color: #dc3545; background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Error en Sincronización</h1>
                    <div class="error">
                        <h3>Error:</h3>
                        <p>${error.message}</p>
                    </div>
                    <a href="/api/infoautos-local/sync" class="btn">🔄 Reintentar</a>
                </div>
            </body>
            </html>
        `);
    }
});

// POST /api/infoautos-local/sync - Endpoint API para sincronización programática
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
