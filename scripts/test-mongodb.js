const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoDB() {
  try {
    console.log('🔌 Probando conexión a MongoDB...');
    console.log('URI:', process.env.MONGODB_URI);
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado a MongoDB exitosamente');
    
    // Listar las bases de datos
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('📊 Bases de datos disponibles:', dbs.databases.map(db => db.name));
    
    // Verificar la colección info-autos
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Colecciones disponibles:', collections.map(col => col.name));
    
    // Intentar crear un documento de prueba
    const InfoAuto = require('../models/InfoAuto');
    const testDoc = new InfoAuto({
      year: 2024,
      brand: { id: 'test', name: 'Test Brand' },
      model: { id: 'test', name: 'Test Model' },
      version: { id: 'test', name: 'Test Version' }
    });
    
    await testDoc.save();
    console.log('✅ Documento de prueba creado exitosamente');
    
    // Contar documentos
    const count = await InfoAuto.countDocuments();
    console.log(`📊 Total de documentos en info-autos: ${count}`);
    
    // Eliminar documento de prueba
    await InfoAuto.deleteOne({ 'brand.id': 'test' });
    console.log('🧹 Documento de prueba eliminado');
    
    console.log('🎉 Prueba de MongoDB completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en prueba de MongoDB:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

testMongoDB();
