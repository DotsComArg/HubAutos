# 🔐 Configuración de Service Account para Google Sheets

## ¿Por qué Service Account?

- ✅ **NO expira nunca**
- ✅ **Más seguro** para aplicaciones de producción
- ✅ **Sin interacción del usuario** necesaria
- ✅ **Permisos granulares** y controlados

## 📋 Pasos para configurar:

### 1. Crear Service Account
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **IAM & Admin** → **Service Accounts**
4. Haz clic en **Create Service Account**
5. Dale un nombre como "hubautos-sheets"
6. Haz clic en **Create and Continue**

### 2. Asignar permisos
1. En **Grant this service account access to project**
2. Selecciona **Editor** o **Viewer** (según necesites)
3. Haz clic en **Continue** y luego **Done**

### 3. Crear y descargar la clave
1. Haz clic en el email del service account creado
2. Ve a **Keys** → **Add Key** → **Create new key**
3. Selecciona **JSON**
4. Descarga el archivo JSON

### 4. Compartir la hoja de cálculo
1. Abre tu Google Sheets
2. Haz clic en **Share** (Compartir)
3. Agrega el email del service account (termina en @project.iam.gserviceaccount.com)
4. Dale permisos de **Editor**

### 5. Actualizar el código
Reemplaza la autenticación OAuth2 por Service Account:

```javascript
const { google } = require('googleapis');
const path = require('path');

class GoogleSheets {
  constructor({ serviceAccountPath, spreadsheetId }) {
    this.spreadsheetId = spreadsheetId;
    
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    this.sheets = google.sheets({ version: 'v4', auth });
  }
  
  // ... resto de métodos igual
}
```

## 🚀 Ventajas:
- **Sin expiración** - Funciona para siempre
- **Más rápido** - Sin intercambio de tokens
- **Más seguro** - Sin refresh tokens en el código
- **Ideal para producción** - Sin interrupciones

## ⚠️ Consideraciones:
- **Archivo JSON** debe estar seguro (no subir a Git)
- **Permisos** deben ser mínimos necesarios
- **Backup** del archivo JSON
