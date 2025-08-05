# HubAutos Server

Servidor backend unificado para gestión automatizada de leads automotrices. Integra formularios web con Google Sheets, Kommo CRM y cotización automática en MercadoLibre.

## Funcionalidades

- **API REST** para procesar cotizaciones de autos
- **Integración con Google Sheets** para almacenamiento de datos
- **Integración con Kommo CRM** para gestión de leads
- **Cotización automática** en MercadoLibre con scraping
- **Notas automáticas** con mejores precios encontrados
- **Campos personalizados** actualizados con cotizaciones
- **Formateo automático** de teléfonos argentinos
- **Gestión inteligente** de contactos existentes vs nuevos
- **Acortador de URLs** para las notas de cotización

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

# Cotizador (opcional)
CHROMIUM_PACK_URL=https://github.com/Sparticuz/chromium/releases/download/v135.0.0-next.3/chromium-v135.0.0-next.3-pack.x64.tar

# MongoDB para acortador de URLs (opcional)
MONGODB_URI=tu_mongodb_uri
```

## Endpoints

### POST /api/auto-quote

Procesa una solicitud de cotización de auto con cotización automática.

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

**Respuesta:**
```json
{
  "message": "Datos recibidos correctamente",
  "data": { ... },
  "leadId": "12345"
}
```

### GET /sh/:id

Redirige a la URL original desde un ID acortado.

### GET /api/health

Verifica el estado del servidor.

### GET /

Información del servidor y endpoints disponibles.

## Estructura del Proyecto

```
├── api/
│   └── index.js          # Servidor Express principal unificado
├── classes/
│   ├── googleSheets.js   # Cliente Google Sheets API
│   ├── kommoApi.js       # Cliente Kommo CRM API
│   └── kommoJson.js      # Generador de JSON para Kommo
├── helpers/
│   ├── addCarRow.js      # Helper para agregar filas a Google Sheets
│   └── processQuote.js   # Procesamiento de cotizaciones automáticas
├── utils/
│   ├── phone.js          # Utilidades para formateo de teléfonos
│   ├── cheapest-car.js   # Scraping de MercadoLibre
│   └── urlShortener.js   # Acortador de URLs
└── package.json
```

## Flujo Completo

1. **Formulario Web** envía datos del auto
2. **Backend** recibe la solicitud en `/api/auto-quote`
3. **Google Sheets** guarda los datos como backup
4. **Kommo CRM** crea/actualiza el lead
5. **MercadoLibre** se consulta automáticamente
6. **Cotización** se calcula con los mejores precios
7. **Nota** se agrega al lead con cotizaciones
8. **Campos personalizados** se actualizan con precios
9. **Respuesta** se envía al formulario

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
- **puppeteer-core** - Scraping de MercadoLibre
- **@sparticuz/chromium-min** - Navegador headless para Vercel
- **mongodb** - Base de datos para acortador de URLs
- **nanoid** - Generación de IDs únicos 