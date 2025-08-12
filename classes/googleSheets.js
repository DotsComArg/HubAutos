const { google } = require('googleapis');

class GoogleSheets {
  constructor({ clientId, clientSecret, refreshToken, spreadsheetId }) {
    this.spreadsheetId = spreadsheetId;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  }

  async appendRow(range, rowValues) {
    return this.appendRows(range, [rowValues]);
  }

  async appendRows(range, rows) {
    try {
      const { data } = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
      });

      return data.updates;
    } catch (error) {
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        console.error('❌ Error de autenticación con Google Sheets. El refresh token ha expirado.');
        console.error('💡 Ejecuta el script get-new-token.js para generar un nuevo token.');
        throw new Error('Token de Google expirado. Ejecuta get-new-token.js para renovarlo.');
      }
      
      console.error('❌ Error al escribir en Google Sheets:', error.message);
      throw error;
    }
  }

  async updateRange(range, values) {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    } catch (error) {
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        console.error('❌ Error de autenticación con Google Sheets. El refresh token ha expirado.');
        console.error('💡 Ejecuta el script get-new-token.js para generar un nuevo token.');
        throw new Error('Token de Google expirado. Ejecuta get-new-token.js para renovarlo.');
      }
      
      console.error('❌ Error al actualizar Google Sheets:', error.message);
      throw error;
    }
  }
}

module.exports = GoogleSheets;
