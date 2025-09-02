# Solución Error Chromium en Vercel

## Problema
El error `The input directory "/var/task/node_modules/@sparticuz/chromium-min/bin" does not exist` ocurre cuando la versión de `@sparticuz/chromium-min` no es compatible con Vercel.

## Solución Implementada

### 1. Versiones Compatibles
- `@sparticuz/chromium-min`: `^119.0.2` (en lugar de `^133.0.0`)
- `puppeteer-core`: `^21.5.2` (en lugar de `^24.9.0`)

### 2. Configuración de Vercel
Archivo `vercel.json` actualizado con:
```json
{
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "CHROMIUM_PACK_URL": "https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.x64.tar"
  }
}
```

### 3. Configuración Optimizada de Chromium
Nuevo archivo `config/chromium.js` con configuración específica para Vercel:
- Argumentos optimizados para entorno serverless
- Manejo de errores mejorado
- Verificación de disponibilidad de Chromium

### 4. Manejo de Errores Mejorado
- Verificación previa de disponibilidad de Chromium
- Cierre seguro del navegador
- Logs detallados para debugging

## Pasos para Aplicar la Solución

1. **Actualizar dependencias**:
   ```bash
   npm install
   ```

2. **Verificar configuración**:
   ```bash
   node -e "const chromium = require('@sparticuz/chromium-min'); console.log('Chromium path:', chromium.executablePath());"
   ```

3. **Deploy en Vercel**:
   ```bash
   vercel --prod
   ```

## Variables de Entorno Requeridas

Agregar en Vercel:
```
CHROMIUM_PACK_URL=https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.x64.tar
```

## Testing

Para verificar que funciona:
```bash
curl "https://tu-dominio.vercel.app/api/cheapest-car?q=toyota%20corolla&year=2020&limit=1"
```

## Notas Importantes

- La versión 119.0.2 de Chromium es estable en Vercel
- El timeout está configurado a 30 segundos
- Se deshabilitaron características innecesarias para mejorar rendimiento
- Se agregó manejo robusto de errores

## Troubleshooting

Si el error persiste:
1. Verificar que las variables de entorno estén configuradas en Vercel
2. Revisar los logs de Vercel para más detalles
3. Asegurar que el deploy incluya las nuevas dependencias
