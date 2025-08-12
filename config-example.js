// 📋 CONFIGURACIÓN REQUERIDA PARA VERCEL
// 
// En tu dashboard de Vercel, crea estas variables de entorno:
//
// 1. GOOGLE_SERVICE_ACCOUNT_KEY
//    Valor: Todo el contenido del archivo JSON del Service Account
//    Ejemplo: {"type":"service_account","project_id":"...",...}
//
// 2. GOOGLE_SPREADSHEET_ID  
//    Valor: 1iWAz3-zS7em3yrM9G5QqMqW-xnCf9PdLpPbJ6SimFi8
//
// 3. SUBDOMAIN_KOMMO
//    Valor: hubautos.kommo.com
//
// 4. TOKEN_KOMMO_FORM
//    Valor: eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjIzZDliYzU0NzZkMTZlMjA0NTgyZWU4MTlhMDkxZTEyNDk5YTUyYmY4YzNhMDgxN2FlZWQwYTkxOWQwOGIyOTQ2NTg4NWQxNGY1OGQ4NTM2In0...
//
// 🚀 DESPUÉS DE CONFIGURAR LAS VARIABLES:
// 1. Haz redeploy de tu aplicación en Vercel
// 2. Los datos se escribirán automáticamente en Google Sheets
// 3. El Service Account NUNCA expira
//
// 📚 DOCUMENTACIÓN:
// - setup-service-account.md - Guía completa de configuración
// - classes/googleSheetsService.js - Clase principal del Service Account
