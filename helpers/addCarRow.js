const GoogleSheetsService = require('../classes/googleSheetsService');

// ID de la hoja de cálculo
const SPREADSHEET_ID = '1iWAz3-zS7em3yrM9G5QqMqW-xnCf9PdLpPbJ6SimFi8';

// El Service Account se configura a través de variables de entorno
const sheets = new GoogleSheetsService({
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 
    JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) : 
    null,
  spreadsheetId: SPREADSHEET_ID
});

async function addCarRow(data) {
  // Verificar que las credenciales estén configuradas
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY no está configurada. Configúrala en Vercel.');
  }

  const row = [
    data.year,
    data.brand,
    data.model,
    data.version,
    data.km,
    data.postal,
    data.name,
    data.phone,
    data.email,
  ];

  await sheets.appendRow('1!A1:I', row);
}

module.exports = addCarRow;
