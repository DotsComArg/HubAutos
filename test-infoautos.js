// Script de prueba para la integración con Info Autos
const InfoAutosApi = require('./classes/infoAutosApi');

async function testInfoAutos() {
  console.log('🧪 Iniciando pruebas de Info Autos API...\n');
  
  // Crear instancia de la API
  const api = new InfoAutosApi();
  
  // Configurar tokens
  api.setTokens(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1NjIwODI2OCwianRpIjoiZTNlMThmZmYtNWJiOS00NTMxLTg1NTUtNjJjOTllNzk0NTYxIiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5Ijo1MzcsIm5iZiI6MTc1NjIwODI2OCwiY3NyZiI6IjYwM2ZmYmRhLTcwN2QtNDFlYS04MWVkLWJkNDA2MzVhYzA2YyIsImV4cCI6MTc1NjIxMTg2OCwicm9sZXMiOlt7ImlkIjoxOSwibmFtZSI6IkRlc2Fycm9sbG8ifSx7ImlkIjoxMCwibmFtZSI6IkV4dHJhcyJ9LHsiaWQiOjksIm5hbWUiOiJNb2RlbG9zIn1dfQ.8aiEYcre36pwUe60ofc8CcHvkbVKjGnlNbapebI-fsU",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1NjIwODI2OCwianRpIjoiNDliYTI5YTYtZmEyZC00ZjA5LTlhOWItYTlmNDUwNDg4NTdhIiwidHlwZSI6InJlZnJlc2giLCJpZGVudGl0eSI6NTM3LCJuYmYiOjE3NTYyMDgyNjgsImNzcmYiOiIxM2UwNmM5NS0wNDJkLTQyN2YtOTY2ZC1iYzc5YTRmOTkwN2UiLCJleHAiOjE3NTYyOTQ2NjgsInJvbGVzIjpbeyJpZCI6MTksIm5hbWUiOiJEZXNhcnJvbGxvIn0seyJpZCI6MTAsIm5hbWUiOiJFeHRyYXMifSx7ImlkIjo5LCJuYW1lIjoiTW9kZWxvcyJ9XX0.WL6_AlHI8mxlZyoSGxsQ_n4kICWKMvEFtu4X10TJ6vc"
  );
  
  try {
    // 1. Probar conexión
    console.log('1️⃣ Probando conexión...');
    const connection = await api.checkConnection();
    console.log('✅ Conexión:', connection.message);
    
    // 2. Obtener años
    console.log('\n2️⃣ Obteniendo años...');
    const years = await api.getYears();
    console.log(`✅ Años obtenidos: ${years.length}`);
    console.log('📅 Primeros 5 años:', years.slice(0, 5));
    
    if (years.length > 0) {
      const testYear = years[0].id;
      
      // 3. Obtener marcas para el primer año
      console.log(`\n3️⃣ Obteniendo marcas para año ${testYear}...`);
      const brands = await api.getBrands(testYear);
      console.log(`✅ Marcas obtenidas: ${brands.length}`);
      console.log('🏷️ Primeras 5 marcas:', brands.slice(0, 5));
      
      if (brands.length > 0) {
        const testBrand = brands[0].id;
        
        // 4. Obtener modelos para la primera marca
        console.log(`\n4️⃣ Obteniendo modelos para marca ${testBrand} año ${testYear}...`);
        const models = await api.getModels(testYear, testBrand);
        console.log(`✅ Modelos obtenidos: ${models.length}`);
        console.log('🚗 Primeros 5 modelos:', models.slice(0, 5));
        
        if (models.length > 0) {
          const testModel = models[0].id;
          
          // 5. Obtener versiones para el primer modelo
          console.log(`\n5️⃣ Obteniendo versiones para modelo ${testModel}...`);
          const versions = await api.getVersions(testYear, testBrand, testModel);
          console.log(`✅ Versiones obtenidas: ${versions.length}`);
          console.log('🔧 Primeras 5 versiones:', versions.slice(0, 5));
        }
      }
    }
    
    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testInfoAutos();
}

module.exports = { testInfoAutos };
