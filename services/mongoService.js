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

  async getAllFormEntries(limit = 100, skip = 0) {
    await this.connect();
    
    try {
      const entries = await FormEntry.find()
        .sort({ fecha: -1 })
        .limit(limit)
        .skip(skip);
      
      return entries;
    } catch (error) {
      console.error('❌ Error obteniendo entradas de MongoDB:', error);
      throw error;
    }
  }

  async getFormEntriesByDateRange(startDate, endDate) {
    await this.connect();
    
    try {
      const entries = await FormEntry.find({
        fecha: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ fecha: -1 });
      
      return entries;
    } catch (error) {
      console.error('❌ Error obteniendo entradas por rango de fecha:', error);
      throw error;
    }
  }

  async getFormEntriesByBrand(brand) {
    await this.connect();
    
    try {
      const entries = await FormEntry.find({
        marca: { $regex: brand, $options: 'i' }
      }).sort({ fecha: -1 });
      
      return entries;
    } catch (error) {
      console.error('❌ Error obteniendo entradas por marca:', error);
      throw error;
    }
  }

  async getStats() {
    await this.connect();
    
    try {
      const total = await FormEntry.countDocuments();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await FormEntry.countDocuments({
        fecha: { $gte: today }
      });
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekCount = await FormEntry.countDocuments({
        fecha: { $gte: weekAgo }
      });
      
      const avgKm = await FormEntry.aggregate([
        { $group: { _id: null, avgKm: { $avg: '$km' } } }
      ]);
      
      return {
        total,
        hoy: todayCount,
        estaSemana: weekCount,
        promedioKm: avgKm.length > 0 ? Math.round(avgKm[0].avgKm / 1000 * 10) / 10 + 'K' : '0K'
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  async updateFormEntry(id, updateData) {
    await this.connect();
    
    try {
      const updatedEntry = await FormEntry.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
      
      return updatedEntry;
    } catch (error) {
      console.error('❌ Error actualizando entrada en MongoDB:', error);
      throw error;
    }
  }

  async deleteFormEntry(id) {
    await this.connect();
    
    try {
      await FormEntry.findByIdAndDelete(id);
      console.log('✅ Entrada eliminada de MongoDB:', id);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando entrada de MongoDB:', error);
      throw error;
    }
  }
}

module.exports = MongoService;
