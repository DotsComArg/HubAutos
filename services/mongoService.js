const mongoose = require('mongoose');
const FormEntry = require('../models/FormEntry');

class MongoService {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI no está configurada');
      }

      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      this.isConnected = true;
      console.log('✅ Conectado a MongoDB');
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔌 Desconectado de MongoDB');
    }
  }

  async saveFormEntry(data) {
    await this.connect();
    
    try {
      const formEntry = new FormEntry({
        fecha: new Date(),
        ano: parseInt(data.year) || parseInt(data.ano),
        modelo: data.model || data.modelo,
        marca: data.brand || data.marca,
        version: data.version || "",
        km: parseInt(data.km) || parseInt(data.kilometraje),
        nombre: data.name || data.nombre_completo || data.fullName,
        email: data.email,
        celular: data.phone || data.telefono || data.celular,
        telefono: data.phone || data.telefono,
        postal: data.postal || data.codigo_postal,
        dni: data.dni,
        nombre_completo: data.name || data.nombre_completo || data.fullName
      });

      const savedEntry = await formEntry.save();
      console.log('✅ Entrada guardada en MongoDB:', savedEntry._id);
      return savedEntry;
    } catch (error) {
      console.error('❌ Error guardando entrada en MongoDB:', error);
      throw error;
    }
  }

  async getFormEntriesWithPagination(page = 1, limit = 100) {
    await this.connect();
    
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Contar total de registros
      const total = await FormEntry.countDocuments();
      
      // Obtener registros paginados
      const entries = await FormEntry.find()
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      return {
        entries,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      };
    } catch (error) {
      console.error('❌ Error obteniendo entradas paginadas de MongoDB:', error);
      throw error;
    }
  }

  async getDashboardStats() {
    await this.connect();
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      // Contar registros totales
      const totalRegistros = await FormEntry.countDocuments();
      
      // Contar registros de hoy
      const registrosHoy = await FormEntry.countDocuments({
        fecha: { $gte: today }
      });
      
      // Contar registros de esta semana
      const registrosEstaSemana = await FormEntry.countDocuments({
        fecha: { $gte: startOfWeek }
      });
      
      // Calcular promedio de kilómetros
      const kmStats = await FormEntry.aggregate([
        { $group: { _id: null, promedioKm: { $avg: '$km' } } }
      ]);
      
      const promedioKm = kmStats.length > 0 ? Math.round(kmStats[0].promedioKm) : 0;
      
      return {
        totalRegistros,
        registrosHoy,
        registrosEstaSemana,
        promedioKm
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del dashboard:', error);
      throw error;
    }
  }
}

module.exports = MongoService;
