# Plan de Integración: HubAutos Server + Cotizador

## Objetivo
Unificar ambos proyectos en un solo sistema que:
1. Reciba datos del formulario web
2. Guarde en Google Sheets
3. Cree/actualice leads en Kommo
4. **NUEVO**: Haga cotización automática en MercadoLibre
5. **NUEVO**: Cree notas con mejores precios
6. **NUEVO**: Actualice campos personalizados con cotizaciones

## Estructura del proyecto unificado

```
hubAutosServer/
├── api/
│   └── index.js                 # Servidor principal unificado
├── classes/
│   ├── googleSheets.js          # ✅ Ya existe
│   ├── kommoApi.js              # ✅ Ya existe (mejorado)
│   └── kommoJson.js             # ✅ Ya existe
├── utils/
│   ├── phone.js                 # ✅ Ya existe
│   ├── cheapest-car.js          # 🔄 Integrar del cotizador
│   └── urlShortener.js          # 🔄 Integrar del cotizador
├── helpers/
│   ├── addCarRow.js             # ✅ Ya existe
│   └── processQuote.js          # 🆕 Nueva función de cotización
├── package.json                 # 🔄 Actualizar dependencias
└── vercel.json                  # ✅ Ya existe
```

## Nuevas funcionalidades a agregar

### 1. Cotización automática
- Scraping de MercadoLibre con Puppeteer
- Búsqueda de autos similares
- Cálculo de cotización sugerida
- Conversión USD a pesos (dólar blue)

### 2. Notas automáticas en Kommo
- Lista de mejores precios encontrados
- URLs acortadas para cada auto
- Cotización sugerida y rango de precios
- Formato profesional en markdown

### 3. Campos personalizados actualizados
- Precio sugerido
- Precio mínimo
- Precio máximo
- Rango de cotización

## Flujo completo integrado

```
Formulario Web → Backend Unificado → [Google Sheets + Kommo + Cotización]
```

1. **Recibe datos** del formulario
2. **Guarda en Google Sheets** (backup)
3. **Crea/actualiza lead** en Kommo
4. **Busca cotizaciones** en MercadoLibre
5. **Calcula precios** sugeridos
6. **Crea nota** con mejores opciones
7. **Actualiza campos** personalizados
8. **Responde** al formulario

## Dependencias a agregar

```json
{
  "@sparticuz/chromium-min": "^133.0.0",
  "puppeteer-core": "^24.9.0",
  "mongodb": "^6.16.0",
  "nanoid": "^3.3.11"
}
```

## Variables de entorno adicionales

```env
# Para el cotizador
CHROMIUM_PACK_URL=https://github.com/Sparticuz/chromium/releases/download/v135.0.0-next.3/chromium-v135.0.0-next.3-pack.x64.tar

# Para acortador de URLs (opcional)
MONGODB_URI=tu_mongodb_uri
```

## Beneficios de la integración

✅ **Un solo deploy** en Vercel
✅ **Un solo endpoint** para todo el proceso
✅ **Menos complejidad** de mantenimiento
✅ **Mejor experiencia** del usuario
✅ **Cotización automática** sin intervención manual
✅ **Datos centralizados** en un solo lugar

## Próximos pasos

1. ✅ Analizar ambos proyectos
2. 🔄 Integrar dependencias del cotizador
3. 🔄 Migrar funciones de scraping
4. 🔄 Crear función de procesamiento unificado
5. 🔄 Actualizar endpoint principal
6. 🔄 Probar integración completa
7. 🔄 Documentar nuevo flujo 