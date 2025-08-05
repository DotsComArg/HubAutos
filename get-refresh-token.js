const { google } = require('googleapis');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Reemplaza con tus credenciales
const CLIENT_ID = 'TU_CLIENT_ID_AQUI';
const CLIENT_SECRET = 'TU_CLIENT_SECRET_AQUI';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // Para aplicaciones de escritorio
);

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets'
];

async function getRefreshToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Esto fuerza a que siempre se genere un refresh token
  });

  console.log('🔗 Abre este enlace en tu navegador:');
  console.log(authUrl);
  console.log('\n');

  rl.question('📋 Pega el código de autorización que obtuviste: ', async (code) => {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('\n✅ ¡Éxito! Aquí están tus tokens:');
      console.log('\n🔄 Refresh Token:');
      console.log(tokens.refresh_token);
      console.log('\n🔑 Access Token:');
      console.log(tokens.access_token);
      console.log('\n📝 Copia el Refresh Token y agrégalo a tus variables de entorno como GOOGLE_REFRESH_TOKEN');
      
      rl.close();
    } catch (error) {
      console.error('❌ Error al obtener el token:', error.message);
      rl.close();
    }
  });
}

console.log('🚀 Script para obtener Google Refresh Token');
console.log('==========================================\n');

if (CLIENT_ID === 'TU_CLIENT_ID_AQUI' || CLIENT_SECRET === 'TU_CLIENT_SECRET_AQUI') {
  console.log('❌ Primero debes editar este archivo y agregar tu CLIENT_ID y CLIENT_SECRET');
  console.log('   Líneas 8 y 9 del archivo get-refresh-token.js');
  rl.close();
} else {
  getRefreshToken();
} 