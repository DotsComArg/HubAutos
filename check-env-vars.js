#!/usr/bin/env node

/**
 * Script para verificar que todas las variables de entorno estén configuradas
 * Ejecutar con: node check-env-vars.js
 */

require('dotenv').config();

// Lista de variables requeridas
const REQUIRED_VARS = {
  // Básicas
  PORT: 'Puerto del servidor',
  NODE_ENV: 'Entorno de ejecución',
  
  // Google Sheets
  GOOGLE_CLIENT_ID: 'ID del cliente de Google',
  GOOGLE_CLIENT_SECRET: 'Secret del cliente de Google',
  GOOGLE_REFRESH_TOKEN: 'Token de renovación de Google',
  GOOGLE_SPREADSHEET_ID: 'ID de la hoja de cálculo',
  GOOGLE_SERVICE_ACCOUNT_KEY: 'JSON del Service Account de Google',
  
  // Kommo CRM
  SUBDOMAIN_KOMMO: 'Subdominio de Kommo',
  TOKEN_KOMMO_FORM: 'Token para formularios de Kommo',
  TOKEN_KOMMO: 'Token general de Kommo',
  
  // MercadoLibre
  MELI_APP_ID: 'ID de la aplicación de MercadoLibre',
  MELI_CLIENT_SECRET: 'Secret del cliente de MercadoLibre',
  MELI_REFRESH_TOKEN: 'Token de renovación de MercadoLibre',
  
  // InfoAutos
  INFOAUTOS_USERNAME: 'Usuario de InfoAutos',
  INFOAUTOS_PASSWORD: 'Contraseña de InfoAutos',
  
  // MongoDB
  MONGODB_URI: 'URI de conexión a MongoDB',
  MONGO_URI: 'URI alternativa de MongoDB',
  
  // Chromium
  CHROMIUM_PACK_URL: 'URL del paquete de Chromium'
};

// Variables opcionales (con valores por defecto)
const OPTIONAL_VARS = {
  PORT: '3000',
  NODE_ENV: 'development',
  INFOAUTOS_USERNAME: 'gdentice@agpgroup.com.ar',
  INFOAUTOS_PASSWORD: '4Eiqt6pxuAC1XmM0',
  CHROMIUM_PACK_URL: 'https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.x64.tar'
};

function checkEnvironmentVariables() {
  console.log('🔍 Verificando variables de entorno...\n');
  
  let allGood = true;
  let missingVars = [];
  let presentVars = [];
  
  // Verificar variables requeridas
  for (const [varName, description] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[varName];
    
    if (!value) {
      // Verificar si es opcional
      if (OPTIONAL_VARS[varName]) {
        console.log(`⚠️  ${varName}: ${description} (OPCIONAL - usando valor por defecto)`);
        presentVars.push(varName);
      } else {
        console.log(`❌ ${varName}: ${description} - NO CONFIGURADA`);
        missingVars.push(varName);
        allGood = false;
      }
    } else {
      // Verificar formato de variables especiales
      if (varName === 'GOOGLE_SERVICE_ACCOUNT_KEY') {
        try {
          JSON.parse(value);
          console.log(`✅ ${varName}: ${description} - JSON válido`);
        } catch (error) {
          console.log(`❌ ${varName}: ${description} - JSON INVÁLIDO`);
          missingVars.push(varName);
          allGood = false;
        }
      } else if (varName.includes('URI') && !value.startsWith('mongodb')) {
        console.log(`⚠️  ${varName}: ${description} - Verificar formato de URI`);
        presentVars.push(varName);
      } else {
        // Ocultar valores sensibles
        const displayValue = varName.includes('SECRET') || varName.includes('TOKEN') || varName.includes('PASSWORD') 
          ? '***' + value.slice(-4) 
          : value;
        console.log(`✅ ${varName}: ${description} - ${displayValue}`);
        presentVars.push(varName);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (allGood) {
    console.log('🎉 ¡Todas las variables de entorno están configuradas correctamente!');
  } else {
    console.log('❌ Faltan las siguientes variables de entorno:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}: ${REQUIRED_VARS[varName]}`);
    });
  }
  
  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Configuradas: ${presentVars.length}`);
  console.log(`   ❌ Faltantes: ${missingVars.length}`);
  console.log(`   📋 Total: ${Object.keys(REQUIRED_VARS).length}`);
  
  // Mostrar instrucciones si faltan variables
  if (!allGood) {
    console.log('\n📝 Para configurar las variables faltantes:');
    console.log('   1. En Vercel: Settings → Environment Variables');
    console.log('   2. En local: Crear archivo .env con las variables');
    console.log('   3. Ver documentación: VERCEL_ENV_SETUP.md');
  }
  
  return allGood;
}

// Ejecutar verificación
if (require.main === module) {
  const success = checkEnvironmentVariables();
  process.exit(success ? 0 : 1);
}

module.exports = { checkEnvironmentVariables };
