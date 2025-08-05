const cheapestCar = require('../utils/cheapest-car');
const urlShortener = require('../utils/urlShortener');
const { KommoApiClient } = require('../classes/kommoApi');

const URL_BASE = "https://hub-autos-dotscoms-projects.vercel.app";

/**
 * Obtiene la cotización del dólar blue
 */
async function getDolarBlue() {
  try {
    const response = await fetch("https://api.bluelytics.com.ar/v2/latest");
    const data = await response.json();
    return data.blue.value_sell;
  } catch (error) {
    console.error("Error al obtener el dolar blue:", error);
    return 1000; // Valor por defecto si falla
  }
}

/**
 * Formatea un número en pesos argentinos con separador de miles
 */
const formatPesos = (n) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);

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

  // 3. Mapear cada ítem y calcular precio en pesos + acortar URL
  const detalles = await Promise.all(
    items.map(async item => {
      const { price, currency, title, link, image, year, km, location, validated } = item;
      if (typeof price !== "number") {
        throw new TypeError(`price inválido en "${title}"`);
      }
      const tiny = await urlShortener.shortenUrl(link);
      const precioPesos = currency === "US$"
        ? Math.round(price * dolarBlue)
        : price;

      return { ...item, precioPesos, tiny };
    })
  );

  // 4. Función interna para seleccionar hasta 3 autos más baratos
  function selectValidCheapest(arr) {
    const sorted = [...arr].sort((a, b) => a.precioPesos - b.precioPesos);

    if (sorted.length <= 3) {
      return sorted;
    }

    // Ventana deslizante de tamaño 3
    for (let i = 0; i <= sorted.length - 3; i++) {
      const trio = sorted.slice(i, i + 3);
      const base = trio[0].precioPesos;
      const gap = trio.slice(1).some(auto =>
        (auto.precioPesos - base) / base >= 0.30
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
  const valorSumado = seleccionados.reduce((sum, a) => sum + a.precioPesos, 0);
  const promedio = valorSumado / seleccionados.length;
  const cotizacionSugerida = promedio;
  const valorMaximo = Math.round(promedio * 0.88);
  const valorMinimo = Math.round(promedio * 0.82);

  // 6. Formatear la lista de salida
  const lines = seleccionados.map(a => {
    const parts = [
      a.year,
      a.title,
      `$${formatPesos(a.precioPesos)}`,
      a.currency === "US$" ? `Blue: ${dolarBlue}` : "",
      `${URL_BASE}/sh/${a.tiny}`
    ];
    return parts.filter(Boolean).join(" | ");
  });

  lines.push(`Cotización sugerida: $${formatPesos(cotizacionSugerida)}`);
  lines.push(`Rango: $${formatPesos(valorMinimo)} – $${formatPesos(valorMaximo)}`);

  return {
    cotizacionSugerida,
    listFormatted: lines.join("\n"),
    valorMaximo,
    valorMinimo
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
    const jsonlead = {
      custom_fields_values: [
        {
          field_id: 1821619, // Precio sugerido
          values: [{ value: tablePrices.cotizacionSugerida.toString() }]
        },
        {
          field_id: 1821933, // Precio mínimo
          values: [{ value: tablePrices.valorMinimo.toString() }]
        },
        {
          field_id: 1821931, // Precio máximo
          values: [{ value: tablePrices.valorMaximo.toString() }]
        },
        {
          field_id: 1821941, // Rango de cotización
          values: [{ 
            value: `Valor sugerido desde: ${tablePrices.valorMinimo.toString()} hasta: ${tablePrices.valorMaximo.toString()}` 
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
  getDolarBlue,
  formatPesos
}; 