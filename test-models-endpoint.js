const axios = require('axios');

// URL del backend
const BASE_URL = 'https://hubsautos.dotscomagency.com';

// Función para probar el endpoint de modelos
async function testModelsEndpoint() {
  try {
    console.log('🧪 Probando endpoint de modelos...');
    
    // Parámetros de prueba
    const brandId = '12'; // CHEVROLET
    const year = '2023';
    
    console.log(`📋 Probando marca ${brandId} año ${year}...`);
    
    // Hacer la petición al endpoint
    const response = await axios.get(`${BASE_URL}/api/vehicles/brands/${brandId}/models`, {
      params: { year },
      timeout: 30000
    });
    
    console.log('✅ Respuesta recibida:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Source:', response.data.source);
    console.log('BrandId:', response.data.brandId);
    console.log('Year:', response.data.year);
    console.log('Total Models:', response.data.totalModels);
    console.log('Filtered Models:', response.data.filteredModels);
    console.log('Method:', response.data.method);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📊 Modelos encontrados:');
      response.data.data.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name} (ID: ${model.id})`);
      });
    } else {
      console.log('\n⚠️ No se encontraron modelos');
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Ejecutar la prueba
testModelsEndpoint();
