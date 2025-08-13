const cheapestCar = require('../utils/cheapest-car');
const urlShortener = require('../utils/urlShortener');
const { KommoApiClient } = require('../classes/kommoApi');

const URL_BASE = "https://hub-autos-dotscoms-projects.vercel.app";



/**
 * Formatea un número en pesos argentinos con puntos como separador de miles
 */
const formatPesos = (n) => {
  if (!n || n === 0) return '';
  return parseInt(n).toLocaleString('es-AR');
};

/**
 * Formatea un precio con símbolo de peso y puntos como separador
 */
const formatPrice = (n) => {
  if (!n || n === 0) return '';
  return `$${parseInt(n).toLocaleString('es-AR')}`;
};

/**
 * Genera una lista formateada de autos con cotizaciones
 */
async function generateSimpleList(items) {
  // 1. Validaciones básicas
  if (!Array.isArray(items)) {
    throw new TypeError("Debe recibir un array de autos");
  }
  if (items.length < 1 || items.length > 10) {
    throw new RangeError("El array debe tener entre 1 y 10 autos");
  }

  // 2. Obtener la tasa del dólar blue
  let dolarBlue;
  try {
    dolarBlue = await getDolarBlue();
  } catch (err) {
    throw new Error("No se pudo obtener la tasa de Dólar Blue");
  }

  // 3. Mapear cada ítem y acortar URL (mantener precios originales)
  const detalles = await Promise.all(
    items.map(async item => {
      const { price, currency, title, link, image, year, km, location, validated } = item;
      if (typeof price !== "number") {
        throw new TypeError(`price inválido en "${title}"`);
      }
      const tiny = await urlShortener.shortenUrl(link);

      return { ...item, tiny };
    })
  );

  // 4. Función interna para seleccionar hasta 3 autos más baratos
  function selectValidCheapest(arr) {
    const sorted = [...arr].sort((a, b) => a.price - b.price);

    if (sorted.length <= 3) {
      return sorted;
    }

    // Ventana deslizante de tamaño 3
    for (let i = 0; i <= sorted.length - 3; i++) {
      const trio = sorted.slice(i, i + 3);
      const base = trio[0].price;
      const gap = trio.slice(1).some(auto =>
        (auto.price - base) / base >= 0.30
      );
      if (!gap) {
        return trio;
      }
    }

    // Fallback: devolver los 3 más baratos aunque no cumplan gap
    return sorted.slice(0, 3);
  }

  const seleccionados = selectValidCheapest(detalles);

  // 5. Sumatorio y cálculos de promedio y rangos basados en seleccionados
  const valorSumado = seleccionados.reduce((sum, a) => sum + a.price, 0);
  const promedio = valorSumado / seleccionados.length;
  const cotizacionSugerida = promedio;
  const valorMaximo = Math.round(promedio * 0.88);
  const valorMinimo = Math.round(promedio * 0.82);

  // 6. Formatear la lista de salida
  const lines = seleccionados.map(a => {
    const parts = [
      a.year,
      a.title,
      a.currency === "US$" ? `US$${a.price.toLocaleString('en-US')}` : `$${a.price.toLocaleString('es-AR')}`,
      `${URL_BASE}/sh/${a.tiny}`
    ];
    return parts.filter(Boolean).join(" | ");
  });

  // Determinar moneda predominante para la cotización sugerida
  const monedaPredominante = seleccionados.filter(a => a.currency === "US$").length > seleccionados.filter(a => a.currency === "$").length ? "US$" : "$";
  
  if (monedaPredominante === "US$") {
    lines.push(`Cotización sugerida: US$${cotizacionSugerida.toLocaleString('en-US')}`);
    lines.push(`Rango: US$${valorMinimo.toLocaleString('en-US')} – US$${valorMaximo.toLocaleString('en-US')}`);
  } else {
    lines.push(`Cotización sugerida: $${cotizacionSugerida.toLocaleString('es-AR')}`);
    lines.push(`Rango: $${valorMinimo.toLocaleString('es-AR')} – $${valorMaximo.toLocaleString('es-AR')}`);
  }

  return {
    cotizacionSugerida,
    listFormatted: lines.join("\n"),
    valorMaximo,
    valorMinimo,
    monedaPredominante
  };
}

/**
 * Procesa la cotización completa para un lead
 */
async function processQuote(data) {
  try {
    console.log("Iniciando proceso de cotización para:", data);
    
    // Crear cliente de Kommo
    const kommoApiClient = new KommoApiClient(
      process.env.SUBDOMAIN_KOMMO,
      process.env.TOKEN_KOMMO_FORM
    );

    // Buscar cotizaciones en MercadoLibre
    const query = `${data.marca} ${data.modelo} ${data.version} ${data.kilometraje || data.km}`;
    const cheapestCarData = await cheapestCar({
      q: query,
      year: Number(data.ano || data.year),
      usedOnly: true,
    });

    console.log("Datos de cotización obtenidos:", cheapestCarData);

    // Validar si hay resultados
    if (cheapestCarData && cheapestCarData.error) {
      console.log("Error en cotización:", cheapestCarData.error);
      return {
        success: false,
        error: `No se encontraron resultados: ${cheapestCarData.error}`,
        url: cheapestCarData.url
      };
    }

    if (!Array.isArray(cheapestCarData) || cheapestCarData.length === 0) {
      console.log("No se encontraron autos para la búsqueda");
      return {
        success: false,
        error: "No se encontraron autos que coincidan con la búsqueda"
      };
    }

    // Generar cotización formateada
    const tablePrices = await generateSimpleList(cheapestCarData);

    // Preparar datos para actualizar el lead
    const monedaPredominante = tablePrices.monedaPredominante || "$";
    const formatearPrecio = (valor) => {
      if (monedaPredominante === "US$") {
        return `US$${valor.toLocaleString('en-US')}`;
      } else {
        return `$${valor.toLocaleString('es-AR')}`;
      }
    };

    const jsonlead = {
      custom_fields_values: [
        {
          field_id: 1821619, // Precio sugerido
          values: [{ value: formatearPrecio(tablePrices.cotizacionSugerida) }]
        },
        {
          field_id: 1821933, // Precio mínimo
          values: [{ value: formatearPrecio(tablePrices.valorMinimo) }]
        },
        {
          field_id: 1821931, // Precio máximo
          values: [{ value: formatearPrecio(tablePrices.valorMaximo) }]
        },
        {
          field_id: 1821941, // Rango de cotización
          values: [{ 
            value: `Valor sugerido desde: ${formatearPrecio(tablePrices.valorMinimo)} hasta: ${formatearPrecio(tablePrices.valorMaximo)}` 
          }]
        }
      ]
    };

    // Crear nota con cotizaciones
    const bodyNote = [{
      note_type: "common",
      params: {
        text: `[Cotización Automática]\n\n${tablePrices.listFormatted}`
      }
    }];

    return {
      success: true,
      data: {
        cotizacion: tablePrices,
        leadUpdate: jsonlead,
        note: bodyNote
      }
    };

  } catch (error) {
    console.error("Error en processQuote:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processQuote,
  generateSimpleList,
  formatPesos,
  formatPrice
}; 