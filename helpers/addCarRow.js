const GoogleSheets = require('../classes/googleSheets');

const sheets = new GoogleSheets({
  clientId:        process.env.GOOGLE_CLIENT_ID,
  clientSecret:    process.env.GOOGLE_CLIENT_SECRET,
  refreshToken:    process.env.GOOGLE_REFRESH_TOKEN,
  spreadsheetId:   process.env.GOOGLE_SPREADSHEET_ID,     
});

async function addCarRow(data) {
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
