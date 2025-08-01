# Instrucciones de Despliegue en Vercel

## Configuración Actual

Este proyecto está configurado para funcionar en Vercel como una aplicación serverless.

### Archivos de Configuración

1. **vercel.json**: Configuración de Vercel que indica cómo construir y enrutar la aplicación
2. **api/index.js**: Punto de entrada de la aplicación Express.js

### Rutas Disponibles

- `GET /` - Ruta de prueba principal
- `GET /api/health` - Verificación de estado del servidor
- `POST /api/auto-quote` - Endpoint principal para procesar leads

### Variables de Entorno Requeridas

Asegúrate de configurar estas variables en el dashboard de Vercel:

- `SUBDOMAIN_KOMMO`
- `TOKEN_KOMMO_FORM`
- `PORT` (opcional, Vercel lo maneja automáticamente)

### Comandos de Despliegue

```bash
# Instalar dependencias
npm install

# Desplegar en Vercel
vercel

# Para producción
vercel --prod
```

### Verificación

Después del despliegue, puedes verificar que todo funcione visitando:
- `https://tu-dominio.vercel.app/` - Debería mostrar el mensaje de bienvenida
- `https://tu-dominio.vercel.app/api/health` - Debería mostrar el estado del servidor 