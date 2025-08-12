const { google } = require('googleapis');

class GoogleSheetsService {
  constructor({ serviceAccountKey, spreadsheetId }) {
    this.spreadsheetId = spreadsheetId;
    
    // Crear autenticación con Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    this.sheets = google.sheets({ version: 'v4', auth });
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
      console.error('❌ Error al escribir en Google Sheets:', error.message);
      
      if (error.code === 403) {
        console.error('💡 Verifica que el service account tenga permisos de Editor en la hoja');
        throw new Error('Service account sin permisos. Verifica que tenga acceso de Editor a la hoja.');
      }
      
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
      console.error('❌ Error al actualizar Google Sheets:', error.message);
      
      if (error.code === 403) {
        console.error('💡 Verifica que el service account tenga permisos de Editor en la hoja');
        throw new Error('Service account sin permisos. Verifica que tenga acceso de Editor a la hoja.');
      }
      
      throw error;
    }
  }

  // Método para verificar la conexión
  async testConnection() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      return {
        success: true,
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => sheet.properties.title)
      };
    } catch (error) {
      throw new Error(`Error al conectar con Google Sheets: ${error.message}`);
    }
  }
}

module.exports = GoogleSheetsService;
