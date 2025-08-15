const { LeadJsonCreator } = require('./classes/kommoJson');

// Cargar variables de entorno
require('dotenv').config({ path: './config.env' });

async function testLeadCreation() {
  console.log('🚀 Probando creación de lead...');
  console.log('📋 Pipeline ID configurado:', process.env.PIPELINE_ID);
  console.log('🔧 Pipeline ID por defecto:', 11774380);
  
  const leadCreator = new LeadJsonCreator();
  console.log('🏭 Pipeline ID del creador:', leadCreator.pipelineId);
  
  // Datos del auto de prueba
  const autoData = {
    marca: "Volkswagen",
    modelo: "Gol",
    version: "Trend",
    ano: "2018",
    kilometraje: "65000",
    codigo_postal: "1001",
    nombre_completo: "Juan Pérez Test",
    telefono: "3794556599",
    email: "juan.test@email.com",
    dni: "12345678"
  };
  
  console.log('🚗 Datos del auto:', autoData);
  
  try {
    // Crear JSON simple
    const simpleJson = leadCreator.leadJson(autoData);
    console.log('\n✅ JSON simple creado:');
    console.log('Pipeline ID:', simpleJson[0].pipeline_id);
    console.log('Status ID:', simpleJson[0].status_id);
    console.log('Campos personalizados:', simpleJson[0].custom_fields_values.length);
    
    // Crear JSON complejo
    const complexJson = leadCreator.complexJson(autoData);
    console.log('\n✅ JSON complejo creado:');
    console.log('Pipeline ID:', complexJson[0].pipeline_id);
    console.log('Status ID:', complexJson[0].status_id);
    console.log('Contacto:', complexJson[0]._embedded.contacts[0].name);
    console.log('Teléfono:', complexJson[0]._embedded.contacts[0].custom_fields_values[0].values[0].value);
    
    console.log('\n🎉 ¡Lead creado correctamente!');
    console.log('📊 Resumen:');
    console.log('- Pipeline: Testing (11774380)');
    console.log('- Estado: ENTRY NO INICIÓ (90598860)');
    console.log('- Auto: Volkswagen Gol Trend 2018');
    console.log('- Contacto: Juan Pérez Test - 3794556599');
    
  } catch (error) {
    console.error('❌ Error al crear lead:', error.message);
  }
}

testLeadCreation();
