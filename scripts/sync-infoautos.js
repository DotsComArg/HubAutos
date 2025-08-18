const mongoose = require('mongoose');
const InfoAutosETL = require('../services/infoAutosETL');
require('dotenv').config();

async function main() {
  try {
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');

    // Crear instancia del ETL
    const etl = new InfoAutosETL();

    // Ejecutar sincronización completa
    console.log('🚀 Iniciando sincronización...');
    const result = await etl.syncAllData();

    console.log('✅ Sincronización completada exitosamente');
    console.log(`📊 Total de vehículos sincronizados: ${result.totalVehicles}`);

    // Obtener estadísticas
    const stats = await etl.getSyncStats();
    console.log('📈 Estadísticas finales:', stats);

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = main;
