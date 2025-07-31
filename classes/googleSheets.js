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
    const { data } = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    });

    return data.updates;
  }

  async updateRange(range, values) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }
}

module.exports = GoogleSheets;
