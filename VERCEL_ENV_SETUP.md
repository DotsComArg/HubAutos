# 🔧 Configuración de Variables de Entorno en Vercel

Este documento explica cómo configurar todas las variables de entorno necesarias para el proyecto HubAutos en Vercel.

## 📋 Variables Requeridas

### 🚀 **BÁSICAS**
| Variable | Valor | Descripción |
|----------|-------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `NODE_ENV` | `production` | Entorno de ejecución |

### 📊 **GOOGLE SHEETS API**
| Variable | Valor | Descripción |
|----------|-------|-------------|
| `GOOGLE_CLIENT_ID` | `tu_client_id` | ID del cliente de Google |
| `GOOGLE_CLIENT_SECRET` | `tu_client_secret` | Secret del cliente de Google |
| `GOOGLE_REFRESH_TOKEN` | `tu_refresh_token` | Token de renovación de Google |
| `GOOGLE_SPREADSHEET_ID` | `tu_spreadsheet_id` | ID de la hoja de cálculo |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `{"type":"service_account",...}` | JSON completo del Service Account |

### 🏢 **KOMMO CRM API**
| Variable | Valor | Descripción |
|----------|-------|-------------|
| `SUBDOMAIN_KOMMO` | `tuempresa.kommo.com` | Subdominio de Kommo |
| `TOKEN_KOMMO_FORM` | `tu_access_token` | Token para formularios |
| `TOKEN_KOMMO` | `tu_access_token` | Token general de Kommo |

### 🚗 **MERCADOLIBRE API**
| Variable | Valor | Descripción |
|----------|-------|-------------|
| `MELI_APP_ID` | `3606526295411198` | ID de la aplicación |
| `MELI_CLIENT_SECRET` | `KWRMTltx1zRHmA4Sb18OTcIq5EcCdmYu` | Secret del cliente |
| `MELI_REFRESH_TOKEN` | `TG-68c30837a94b170001cb0861-314161270` | Token de renovación |

### 📈 **INFOAUTOS API**
| Variable | Valor | Descripción |
|----------|-------|-------------|
| `INFOAUTOS_USERNAME` | `gdentice@agpgroup.com.ar` | Usuario de InfoAutos |
| `INFOAUTOS_PASSWORD` | `4Eiqt6pxuAC1XmM0` | Contraseña de InfoAutos |

### 🗄️ **MONGODB**
| Variable | Valor | Descripción |
|----------|-------|-------------|
| `MONGODB_URI` | `tu_mongodb_uri` | URI de conexión a MongoDB |
| `MONGO_URI` | `tu_mongodb_uri` | URI alternativa de MongoDB |

### 🌐 **CHROMIUM PARA VERCEL**
| Variable | Valor | Descripción |
|----------|-------|-------------|
| `CHROMIUM_PACK_URL` | `https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.x64.tar` | URL del paquete de Chromium |

## 🚀 Cómo Configurar en Vercel

### 1. **Acceder al Dashboard de Vercel**
- Ve a [vercel.com](https://vercel.com)
- Selecciona tu proyecto HubAutos

### 2. **Ir a Settings → Environment Variables**
- En el menú lateral, haz clic en "Settings"
- Selecciona "Environment Variables"

### 3. **Agregar Variables**
Para cada variable de la tabla anterior:
- Haz clic en "Add New"
- Ingresa el **Name** (nombre de la variable)
- Ingresa el **Value** (valor de la variable)
- Selecciona los **Environments** (Production, Preview, Development)
- Haz clic en "Save"

### 4. **Variables Especiales**

#### **GOOGLE_SERVICE_ACCOUNT_KEY**
Esta variable debe contener el JSON completo del Service Account como una cadena de texto:
```json
{"type":"service_account","project_id":"tu-proyecto","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

#### **MONGODB_URI**
Formato típico:
```
mongodb+srv://usuario:contraseña@cluster.mongodb.net/nombre_db?retryWrites=true&w=majority
```

## ✅ Verificación

### 1. **Redeploy**
Después de agregar las variables:
- Ve a "Deployments"
- Haz clic en "Redeploy" en el último deployment

### 2. **Verificar Logs**
- Ve a "Functions" → selecciona una función
- Revisa los logs para confirmar que las variables se cargan correctamente

### 3. **Probar Endpoints**
- Prueba los endpoints principales para verificar que todo funciona

## 🔍 Troubleshooting

### **Error: Variable not found**
- Verifica que el nombre de la variable coincida exactamente
- Asegúrate de que esté habilitada para el entorno correcto

### **Error: Invalid JSON**
- Para `GOOGLE_SERVICE_ACCOUNT_KEY`, asegúrate de que el JSON esté en una sola línea
- Escapa las comillas dobles dentro del JSON

### **Error: Connection failed**
- Verifica que las URIs de MongoDB sean correctas
- Confirma que las credenciales de API sean válidas

## 📞 Soporte

Si tienes problemas con la configuración:
1. Revisa los logs de Vercel
2. Verifica que todas las variables estén configuradas
3. Confirma que los valores sean correctos
4. Contacta al equipo de desarrollo si persisten los problemas
