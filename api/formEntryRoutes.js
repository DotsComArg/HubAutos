const express = require('express');
const MongoService = require('../services/mongoService');

const router = express.Router();
const mongoService = new MongoService();

// GET /api/form-entries - Obtener todas las entradas con paginación
router.get('/', async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;
    const entries = await mongoService.getAllFormEntries(parseInt(limit), parseInt(skip));
    
    // Formatear datos para el frontend
    const formattedEntries = entries.map(entry => ({
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
    
    res.json({
      success: true,
      data: formattedEntries,
      count: formattedEntries.length
    });
  } catch (error) {
    console.error('Error obteniendo entradas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/form-entries/stats - Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await mongoService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/form-entries/by-date-range - Obtener entradas por rango de fecha
router.get('/by-date-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren startDate y endDate'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido'
      });
    }
    
    const entries = await mongoService.getFormEntriesByDateRange(start, end);
    
    res.json({
      success: true,
      data: entries,
      count: entries.length
    });
  } catch (error) {
    console.error('Error obteniendo entradas por rango de fecha:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/form-entries/by-brand/:brand - Obtener entradas por marca
router.get('/by-brand/:brand', async (req, res) => {
  try {
    const { brand } = req.params;
    const entries = await mongoService.getFormEntriesByBrand(brand);
    
    res.json({
      success: true,
      data: entries,
      count: entries.length
    });
  } catch (error) {
    console.error('Error obteniendo entradas por marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/form-entries/:id - Obtener entrada específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await mongoService.connect();
    
    const FormEntry = require('../models/FormEntry');
    const entry = await FormEntry.findById(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Entrada no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error obteniendo entrada:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/form-entries/:id - Actualizar entrada
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedEntry = await mongoService.updateFormEntry(id, updateData);
    
    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        error: 'Entrada no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: updatedEntry
    });
  } catch (error) {
    console.error('Error actualizando entrada:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/form-entries/:id - Eliminar entrada
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await mongoService.deleteFormEntry(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Entrada no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Entrada eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando entrada:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
