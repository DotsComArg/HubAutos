# Configuración de Datos de Vehículos - HUB AUTOS

## Resumen de la Solución

Hemos implementado un sistema híbrido que respeta las limitaciones del contrato de Info Autos:

1. **Datos Estáticos Locales**: Archivo JSON con información básica de vehículos
2. **API de Fallback**: Info Autos como respaldo si los datos estáticos fallan
3. **Respeto al Contrato**: Solo mostramos descripciones, NO códigos ni precios

## Estructura de Archivos

```
├── data/
│   └── vehicles.json          # Datos estáticos de vehículos
├── services/
│   └── vehicleDataService.js  # Servicio que maneja los datos
├── api/
│   └── vehicleDataRoutes.js   # Rutas de la API
└── formularioweb.html         # Formulario actualizado
```

## Endpoints Disponibles

### Datos Estáticos (Principal)
- `GET /api/vehicles/years` - Años disponibles
- `GET /api/vehicles/brands/:year` - Marcas por año
- `GET /api/vehicles/models/:year/:brandId` - Modelos por marca y año
- `GET /api/vehicles/versions/:year/:brandId/:modelId` - Versiones por modelo
- `GET /api/vehicles/search?q=query` - Búsqueda de vehículos
- `GET /api/vehicles/stats` - Estadísticas de datos disponibles

### Fallback (Info Autos)
- `GET /api/infoautos/years` - Años desde Info Autos
- `GET /api/infoautos/brands/:year` - Marcas desde Info Autos
- `GET /api/infoautos/models/:year/:brandId` - Modelos desde Info Autos
- `GET /api/infoautos/versions/:year/:brandId/:modelId` - Versiones desde Info Autos

## Cómo Funciona

1. **Primera Prioridad**: El formulario intenta obtener datos de `/api/vehicles/*`
2. **Fallback**: Si falla, automáticamente intenta con `/api/infoautos/*`
3. **Cache**: Los datos se cachean por 30 minutos para mejorar rendimiento

## Ventajas de esta Solución

✅ **Sin Errores 403**: Los datos estáticos siempre funcionan
✅ **Respeto al Contrato**: Solo mostramos descripciones permitidas
✅ **Alta Disponibilidad**: Sistema de fallback automático
✅ **Rendimiento**: Cache local y datos estáticos
✅ **Flexibilidad**: Fácil de actualizar y mantener

## Personalización de Datos

Para agregar más vehículos, edita `data/vehicles.json`:

```json
{
  "years": [
    {"id": "2026", "name": "2026"}
  ],
  "brands": {
    "2026": [
      {"id": "11", "name": "Nueva Marca"}
    ]
  }
}
```

## Monitoreo

Verifica el estado del sistema:

```bash
# Verificar datos estáticos
GET /api/vehicles/health

# Ver estadísticas
GET /api/vehicles/stats

# Verificar Info Autos (fallback)
GET /api/infoautos/health
```

## Tokens Actualizados

Los tokens de Info Autos han sido actualizados en:
- `config/infoAutos.js`
- `config-example.env`

## Próximos Pasos

1. **Probar el formulario** con los datos estáticos
2. **Verificar que Info Autos funcione** como fallback
3. **Expandir la base de datos** con más vehículos según necesites
4. **Monitorear logs** para asegurar que todo funcione correctamente

## Soporte

Si tienes problemas:
1. Verifica los logs del servidor
2. Confirma que los archivos JSON estén bien formateados
3. Verifica que las rutas estén correctamente configuradas
4. Revisa que los tokens de Info Autos sean válidos
