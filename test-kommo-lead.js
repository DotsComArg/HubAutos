const { LeadJsonCreator } = require('./classes/kommoJson');
const axios = require('axios');

// Cargar variables de entorno
require('dotenv').config({ path: './config.env' });

async function createLeadInKommo() {
  console.log('🚀 Creando lead real en Kommo...');
  console.log('📋 Pipeline ID:', process.env.PIPELINE_ID);
  console.log('🌐 Subdominio:', process.env.SUBDOMAIN_KOMMO);
  
  const leadCreator = new LeadJsonCreator();
  
  // Datos del auto de prueba - Chevrolet Onix
  const autoData = {
    marca: "Chevrolet",
    modelo: "Onix",
    version: "Premier",
    ano: "2021",
    kilometraje: "35000",
    codigo_postal: "2000",
    nombre_completo: "María González Test",
    telefono: "3794556599",
    email: "maria.test@email.com",
    dni: "87654321"
  };
  
  try {
    // Crear JSON simple para Kommo (sin contactos embebidos)
    const leadData = leadCreator.leadJson(autoData)[0];
    
    // Convertir pipeline_id a int
    leadData.pipeline_id = parseInt(leadData.pipeline_id);
    
    console.log('📝 Datos del lead a enviar:');
    console.log('- Pipeline ID:', leadData.pipeline_id, '(tipo:', typeof leadData.pipeline_id, ')');
    console.log('- Status ID:', leadData.status_id);
    console.log('- Auto:', `${autoData.marca} ${autoData.modelo} ${autoData.version}`);
    console.log('- Contacto:', autoData.nombre_completo);
    console.log('- Teléfono:', autoData.telefono);
    
    // Limpiar campos vacíos
    const cleanLeadData = {
      ...leadData,
      custom_fields_values: leadData.custom_fields_values.filter(field => 
        field.values && field.values[0] && field.values[0].value !== ""
      )
    };
    
    console.log('\n🧹 JSON limpio a enviar:');
    console.log(JSON.stringify(cleanLeadData, null, 2));
    
    // Configurar headers para Kommo
    const headers = {
      'Authorization': `Bearer ${process.env.TOKEN_KOMMO_FORM}`,
      'Content-Type': 'application/json'
    };
    
    // URL de la API de Kommo
    const kommoUrl = `https://${process.env.SUBDOMAIN_KOMMO}/api/v4/leads`;
    
    console.log('\n📡 Enviando a Kommo...');
    console.log('URL:', kommoUrl);
    
    const response = await axios.post(kommoUrl, [cleanLeadData], { headers });
    
    if (response.data && response.data._embedded && response.data._embedded.leads) {
      const lead = response.data._embedded.leads[0];
      console.log('\n🎉 ¡Lead creado exitosamente en Kommo!');
      console.log('📊 Información del lead:');
      console.log('- ID del lead:', lead.id);
      console.log('- Pipeline:', lead.pipeline_id);
      console.log('- Status:', lead.status_id);
      console.log('- Creado:', new Date(lead.created_at * 1000).toLocaleString('es-AR'));
      
      console.log('\n🔗 Puedes ver el lead en:');
      console.log(`https://${process.env.SUBDOMAIN_KOMMO}/leads/list/kanban/${lead.pipeline_id}`);
      
      console.log('\n📝 Nota: El lead se creó sin contacto. Para agregar el contacto,');
      console.log('   necesitarías crear primero el contacto y luego vincularlo al lead.');
      
    } else {
      console.log('⚠️ Respuesta inesperada de Kommo:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error al crear lead en Kommo:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      // Mostrar errores de validación específicos
      if (error.response.data['validation-errors']) {
        console.error('\n🔍 Errores de validación:');
        error.response.data['validation-errors'].forEach((validationError, index) => {
          console.error(`Error ${index + 1}:`, validationError.errors);
        });
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

createLeadInKommo();
