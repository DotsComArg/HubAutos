# HubAutos Server

Servidor backend para gestión automatizada de leads automotrices. Integra formularios web con Google Sheets y Kommo CRM.

## Funcionalidades

- **API REST** para procesar cotizaciones de autos
- **Integración con Google Sheets** para almacenamiento de datos
- **Integración con Kommo CRM** para gestión de leads
- **Formateo automático** de teléfonos argentinos
- **Gestión inteligente** de contactos existentes vs nuevos

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/DotsComArg/HubAutos.git
cd HubAutos

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

## Variables de Entorno

Crear un archivo `.env` con las siguientes variables:

```env
# Puerto del servidor
PORT=3000

# Google Sheets API
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REFRESH_TOKEN=tu_refresh_token
GOOGLE_SPREADSHEET_ID=tu_spreadsheet_id

# Kommo CRM API
SUBDOMAIN_KOMMO=tuempresa.kommo.com
TOKEN_KOMMO_FORM=tu_access_token
```

## Endpoints

### POST /api/auto-quote

Procesa una solicitud de cotización de auto.

**Body:**
```json
{
  "year": "2020",
  "brand": "Toyota",
  "model": "Corolla",
  "version": "XEI",
  "km": "50000",
  "postal": "1000",
  "name": "Juan Pérez",
  "phone": "1151234567",
  "email": "juan@email.com"
}
```

## Estructura del Proyecto

```
├── api/
│   └── index.js          # Servidor Express principal
├── classes/
│   ├── googleSheets.js   # Cliente Google Sheets API
│   ├── kommoApi.js       # Cliente Kommo CRM API
│   └── kommoJson.js      # Generador de JSON para Kommo
├── helpers/
│   └── addCarRow.js      # Helper para agregar filas a Google Sheets
├── utils/
│   └── phone.js          # Utilidades para formateo de teléfonos
└── package.json
```

## Scripts Disponibles

- `npm start` - Ejecutar en producción
- `npm run dev` - Ejecutar en modo desarrollo con watch

## Dependencias

- **express** - Framework web
- **axios** - Cliente HTTP
- **googleapis** - Google Sheets API
- **google-libphonenumber** - Formateo de teléfonos
- **cors** - Middleware CORS
- **dotenv** - Variables de entorno 