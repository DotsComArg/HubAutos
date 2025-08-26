# Integración con Info Autos API

## Descripción
Esta integración permite consumir datos de la API de Info Autos desde el formulario web de WordPress para obtener información sobre años, marcas, modelos y versiones de vehículos.

## Endpoints Disponibles

### 1. Verificar Conexión
```
GET /api/infoautos/health
```
Verifica el estado de la conexión con Info Autos.

### 2. Obtener Años
```
GET /api/infoautos/years
```
Retorna la lista de años disponibles para consultar información de vehículos.

### 3. Obtener Marcas por Año
```
GET /api/infoautos/brands/{year}
```
Retorna las marcas disponibles para un año específico.

**Parámetros:**
- `year`: Año del vehículo (ej: 2020, 2021, 2022)

### 4. Obtener Modelos por Marca y Año
```
GET /api/infoautos/models/{year}/{brandId}
```
Retorna los modelos disponibles para una marca y año específicos.

**Parámetros:**
- `year`: Año del vehículo
- `brandId`: ID de la marca

### 5. Obtener Versiones por Modelo
```
GET /api/infoautos/versions/{year}/{brandId}/{modelId}
```
Retorna las versiones disponibles para un modelo específico.

**Parámetros:**
- `year`: Año del vehículo
- `brandId`: ID de la marca
- `modelId`: ID del modelo

### 6. Actualizar Tokens
```
POST /api/infoautos/tokens
```
Permite actualizar los tokens de autenticación.

**Body:**
```json
{
  "access_token": "nuevo_access_token",
  "refresh_token": "nuevo_refresh_token"
}
```

## Flujo de Datos en el Formulario

1. **Inicialización**: Al cargar el formulario, se obtienen los años disponibles
2. **Selección de Año**: Al seleccionar un año, se cargan las marcas correspondientes
3. **Selección de Marca**: Al seleccionar una marca, se cargan los modelos
4. **Selección de Modelo**: Al seleccionar un modelo, se cargan las versiones
5. **Selección de Versión**: El usuario selecciona la versión final

## Estructura de Respuesta

Todas las respuestas siguen este formato:

```json
{
  "success": true,
  "data": [
    {
      "id": "identificador_unico",
      "name": "Nombre del elemento"
    }
  ]
}
```

## Manejo de Errores

En caso de error, la respuesta será:

```json
{
  "success": false,
  "error": "Descripción del error"
}
```

## Autenticación

La API utiliza tokens JWT que se refrescan automáticamente cuando expiran. Los tokens se configuran en `config/infoAutos.js`.

## Cache

Los datos se almacenan en cache por 30 minutos para mejorar el rendimiento y reducir las llamadas a la API externa.

## Configuración

Los tokens se configuran en el archivo `config/infoAutos.js`:

```javascript
module.exports = {
  ACCESS_TOKEN: "tu_access_token",
  REFRESH_TOKEN: "tu_refresh_token",
  BASE_URL: "https://api.infoauto.com.ar/cars/pub",
  CACHE_DURATION: 30 * 60 * 1000, // 30 minutos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};
```

## Uso en el Frontend

El formulario ya está configurado para usar estos endpoints. Los selects se poblan automáticamente con los datos de Info Autos.

## Notas Importantes

- Los tokens expiran cada hora y se refrescan automáticamente
- Se implementa cache para mejorar el rendimiento
- Los errores se manejan gracefulmente sin interrumpir la experiencia del usuario
- La API es compatible con el sistema de Select2 del formulario
