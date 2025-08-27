const fetch = require('node-fetch');

async function testModelsEndpoint() {
  try {
    console.log('🧪 Probando endpoint de modelos sin año...');
    
    // Probar con marca AUDI (ID 6)
    const response = await fetch('https://hubsautos.dotscomagency.com/api/vehicles/brands/6/models');
    
    console.log(`📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Respuesta exitosa:');
      console.log(`📊 Total de modelos: ${data.data ? data.data.length : 0}`);
      console.log(`🏷️ Marca ID: ${data.brandId}`);
      console.log(`📝 Source: ${data.source}`);
      
      if (data.data && data.data.length > 0) {
        console.log('🚗 Primeros 5 modelos:');
        data.data.slice(0, 5).forEach((model, index) => {
          console.log(`  ${index + 1}. ${model.name} (ID: ${model.id})`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error en la respuesta:');
      console.log(errorText);
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

testModelsEndpoint();
