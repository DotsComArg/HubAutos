# 🚗 API de Info Autos - HubAutos

## Descripción

La API de Info Autos permite obtener información detallada sobre vehículos, incluyendo años, marcas, modelos y versiones. Esta integración está diseñada para ser revendida a empresas que necesiten datos de vehículos en sus formularios web.

## 🔑 Configuración

### Variables de Entorno

Agregar al archivo `config.env`:

```env
# Info Autos API Configuration
INFOAUTOS_ACCESS_TOKEN=tu_access_token_aqui
INFOAUTOS_REFRESH_TOKEN=tu_refresh_token_aqui
```

### Inicialización

```javascript
const InfoAutosService = require('./classes/infoAutosService');

const infoAutosService = new InfoAutosService();
infoAutosService.initialize(accessToken, refreshToken);
```

## 📡 Endpoints Disponibles

### Base URL
```
http://localhost:3000/api/infoautos
```

### 1. Obtener Años Disponibles
```http
GET /api/infoautos/years
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {"year": 2024},
    {"year": 2023},
    {"year": 2022}
  ]
}
```

### 2. Obtener Marcas por Año
```http
GET /api/infoautos/brands/{year}
```

**Parámetros:**
- `year` (path): Año del vehículo

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {"id": "1", "name": "Volkswagen"},
    {"id": "2", "name": "Ford"},
    {"id": "3", "name": "Chevrolet"}
  ]
}
```

### 3. Obtener Modelos por Marca y Año
```http
GET /api/infoautos/models/{year}/{brandId}
```

**Parámetros:**
- `year` (path): Año del vehículo
- `brandId` (path): ID de la marca

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {"id": "101", "name": "Gol"},
    {"id": "102", "name": "Polo"},
    {"id": "103", "name": "Virtus"}
  ]
}
```

### 4. Obtener Versiones por Modelo
```http
GET /api/infoautos/versions/{year}/{brandId}/{modelId}
```

**Parámetros:**
- `year` (path): Año del vehículo
- `brandId` (path): ID de la marca
- `modelId` (path): ID del modelo

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {"id": "1001", "name": "Trend"},
    {"id": "1002", "name": "Comfortline"},
    {"id": "1003", "name": "Highline"}
  ]
}
```

### 5. Obtener Datos Completos del Vehículo
```http
GET /api/infoautos/vehicle/{year}/{brandId}/{modelId}/{versionId?}
```

**Parámetros:**
- `year` (path): Año del vehículo
- `brandId` (path): ID de la marca
- `modelId` (path): ID del modelo
- `versionId` (path, opcional): ID de la versión

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "brands": [...],
    "models": [...],
    "versions": [...],
    "selectedVersion": {...}
  }
}
```

### 6. Búsqueda de Vehículos
```http
GET /api/infoautos/search?q={searchTerm}&year={year}
```

**Parámetros:**
- `q` (query): Término de búsqueda
- `year` (query, opcional): Año específico para la búsqueda

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "type": "model",
      "year": 2024,
      "brand": {"id": "1", "name": "Volkswagen"},
      "model": {"id": "101", "name": "Gol"},
      "match": "Gol"
    }
  ]
}
```

### 7. Validar Datos del Vehículo
```http
POST /api/infoautos/validate
```

**Body:**
```json
{
  "year": "2024",
  "brandId": "1",
  "modelId": "101",
  "versionId": "1001"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": []
  }
}
```

### 8. Limpiar Cache
```http
POST /api/infoautos/cache/clear
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Cache limpiado exitosamente"
}
```

### 9. Health Check
```http
GET /api/infoautos/health
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Info Autos API funcionando correctamente",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🚀 Uso en Formularios HTML

### Ejemplo Básico

```html
<select id="year" onchange="loadBrands(this.value)">
  <option value="">Selecciona un año</option>
</select>

<select id="brand" onchange="loadModels(year.value, this.value)">
  <option value="">Selecciona una marca</option>
</select>

<select id="model" onchange="loadVersions(year.value, brand.value, this.value)">
  <option value="">Selecciona un modelo</option>
</select>

<select id="version">
  <option value="">Selecciona una versión</option>
</select>
```

### JavaScript para Cargar Datos

```javascript
async function loadBrands(year) {
  try {
    const response = await fetch(`/api/infoautos/brands/${year}`);
    const data = await response.json();
    
    if (data.success) {
      const brandSelect = document.getElementById('brand');
      brandSelect.innerHTML = '<option value="">Selecciona una marca</option>';
      
      data.data.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand.id;
        option.textContent = brand.name;
        brandSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error cargando marcas:', error);
  }
}
```

## 🔧 Características Técnicas

### Cache
- **Duración**: 30 minutos
- **Almacenamiento**: Memoria (Map)
- **Limpieza**: Endpoint `/cache/clear`

### Manejo de Errores
- **HTTP Status Codes**: 200, 400, 500
- **Formato de Error**: JSON con `success: false` y `error`
- **Logging**: Console.error para debugging

### Rate Limiting
- **Implementación**: No implementado (depende de Info Autos)
- **Recomendación**: Implementar en producción

### Seguridad
- **Autenticación**: Bearer Token
- **Refresh Token**: Automático cuando expira
- **CORS**: Habilitado para desarrollo

## 📱 Integración con WordPress

### 1. Agregar Scripts
```html
<script src="https://tu-dominio.com/api/infoautos/script.js"></script>
```

### 2. Inicializar Formulario
```javascript
document.addEventListener('DOMContentLoaded', function() {
  InfoAutosForm.init({
    apiUrl: 'https://tu-dominio.com/api/infoautos',
    yearSelect: '#year',
    brandSelect: '#brand',
    modelSelect: '#model',
    versionSelect: '#version'
  });
});
```

### 3. Manejar Envío
```javascript
document.getElementById('vehicleForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = {
    year: document.getElementById('year').value,
    brand: document.getElementById('brand').value,
    model: document.getElementById('model').value,
    version: document.getElementById('version').value,
    // otros campos del formulario
  };
  
  // Enviar a tu backend
  const response = await fetch('/api/process-vehicle', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(formData)
  });
});
```

## 🧪 Testing

### Archivo de Pruebas
```bash
node test-infoautos.js
```

### Endpoints de Prueba
- `/api/infoautos/health` - Verificar funcionamiento
- `/api/infoautos/years` - Probar obtención de años
- `/api/infoautos/search?q=Gol` - Probar búsqueda

## 📊 Monitoreo

### Métricas Recomendadas
- **Response Time**: Tiempo de respuesta de cada endpoint
- **Error Rate**: Porcentaje de errores por endpoint
- **Cache Hit Rate**: Efectividad del cache
- **API Calls**: Número de llamadas a Info Autos

### Logs
```javascript
console.log('Info Autos API Call:', {
  endpoint: '/brands/2024',
  timestamp: new Date().toISOString(),
  responseTime: responseTime
});
```

## 🚨 Solución de Problemas

### Error: "Token expirado"
- Verificar `INFOAUTOS_ACCESS_TOKEN` en `.env`
- El refresh token se ejecuta automáticamente

### Error: "API no disponible"
- Verificar conectividad con Info Autos
- Revisar logs del servidor
- Probar endpoint `/health`

### Error: "Cache corrupto"
- Ejecutar `/api/infoautos/cache/clear`
- Reiniciar el servidor

## 🔄 Actualizaciones

### Versión 1.0.0
- ✅ Endpoints básicos (años, marcas, modelos, versiones)
- ✅ Cache en memoria
- ✅ Manejo de errores
- ✅ Documentación completa
- ✅ Ejemplos de uso

### Próximas Versiones
- 🔄 Cache distribuido (Redis)
- 🔄 Rate limiting
- 🔄 Métricas avanzadas
- 🔄 Webhooks para actualizaciones
- 🔄 SDK para diferentes lenguajes

## 📞 Soporte

Para soporte técnico o consultas sobre la implementación:
- **Email**: soporte@hubautos.com
- **Documentación**: Este archivo
- **Issues**: Repositorio de GitHub

---

**Desarrollado por HubAutos** 🚗✨
