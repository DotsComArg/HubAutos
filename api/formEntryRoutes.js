const express = require('express');
const MongoService = require('../services/mongoService');

const router = express.Router();
const mongoService = new MongoService();

// GET /api/form-entries - Endpoint principal con paginación básica
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    
    // Validar límites permitidos
    const allowedLimits = [50, 100, 200, 500];
    const validatedLimit = allowedLimits.includes(parseInt(limit)) ? parseInt(limit) : 100;
    
    const result = await mongoService.getFormEntriesWithPagination(parseInt(page), validatedLimit);
    
    // Formatear datos para el frontend
    const formattedEntries = result.entries.map(entry => ({
      fecha: entry.fecha.toISOString().split('T')[0], // YYYY-MM-DD
      ano: entry.ano,
      modelo: entry.modelo,
      marca: entry.marca,
      version: entry.version,
      km: entry.km.toLocaleString('es-AR'), // Formato argentino con puntos
      nombre: entry.nombre,
      email: entry.email,
      celular: entry.celular
    }));
    
    // Calcular información de paginación
    const currentPage = parseInt(page);
    const totalPages = result.totalPages;
    
    res.json({
      success: true,
      data: formattedEntries,
      pagination: {
        page: currentPage,
        limit: validatedLimit,
        total: result.total,
        totalPages: totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    console.error('Error en getFormEntries:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/form-entries/stats - Endpoint para estadísticas del dashboard
router.get('/stats', async (req, res) => {
  try {
    const stats = await mongoService.getDashboardStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error en getStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
