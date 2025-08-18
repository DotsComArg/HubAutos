const mongoose = require('mongoose');
const InfoAutosETL = require('../services/infoAutosETL');
require('dotenv').config();

async function initialSync() {
  try {
    console.log('🚀 Iniciando sincronización inicial de Info Autos...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado a MongoDB');
    
    // Crear instancia del ETL
    const etl = new InfoAutosETL();
    
    // Sincronizar solo el año 2024 para probar
    console.log('🔄 Sincronizando solo el año 2024...');
    const result = await etl.syncYear(2024);
    
    console.log('✅ Sincronización inicial completada:', result);
    
    // Verificar que se guardaron datos
    const InfoAuto = require('../models/InfoAuto');
    const count = await InfoAuto.countDocuments();
    console.log(`📊 Total de vehículos en la base: ${count}`);
    
    // Mostrar algunos ejemplos
    const samples = await InfoAuto.find().limit(5);
    console.log('📋 Ejemplos de vehículos guardados:');
    samples.forEach((vehicle, index) => {
      console.log(`  ${index + 1}. ${vehicle.year} ${vehicle.brand.name} ${vehicle.model.name} ${vehicle.version.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error en sincronización inicial:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

initialSync();
