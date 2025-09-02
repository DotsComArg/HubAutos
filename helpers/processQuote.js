const { getCheapestCar } = require('../utils/cheapest-car');
const urlShortener = require('../utils/urlShortener');
const { KommoApiClient } = require('../classes/kommoApi');

const URL_BASE = "https://hub-autos-dotscoms-projects.vercel.app";

/**
 * Genera una lista formateada de autos con precios originales
 */
async function generateSimpleList(items) {
  // Validaciones básicas
  if (!Array.isArray(items)) {
    throw new TypeError("Debe recibir un array de autos");
  }
  if (items.length < 1 || items.length > 10) {
    throw new RangeError("El array debe tener entre 1 y 10 autos");
  }

  // Mapear cada ítem y acortar URL
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

  // Seleccionar hasta 3 autos más baratos
  const sorted = [...detalles].sort((a, b) => a.price - b.price);
  const seleccionados = sorted.slice(0, 3);

  // Formatear la lista de salida con formato completo
  const lines = seleccionados.map(a => {
    const parts = [
      a.title,
      a.currency === "US$" ? `US$${a.price.toLocaleString('en-US')}` : `$${a.price.toLocaleString('es-AR')}`,
      a.year,
      a.km ? `${a.km} Km` : '',
      a.location || '',
      `${URL_BASE}/sh/${a.tiny}`
    ];
    return parts.filter(Boolean).join(" | ");
  });

  return {
    listFormatted: lines.join("\n"),
    autos: seleccionados
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
    const cheapestCarData = await getCheapestCar(query, Number(data.ano || data.year), 5);

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

    if (!cheapestCarData || !cheapestCarData.title) {
      console.log("No se encontraron autos para la búsqueda");
      return {
        success: false,
        error: "No se encontraron autos que coincidan con la búsqueda"
      };
    }

    // Convertir el resultado único a array para compatibilidad
    const carArray = [{
      title: cheapestCarData.title,
      price: cheapestCarData.price,
      currency: cheapestCarData.price > 10000 ? 'US$' : '$',
      link: cheapestCarData.url || '',
      image: '',
      year: cheapestCarData.year || '',
      km: cheapestCarData.kilometers || '',
      location: '',
      validated: false
    }];

    // Generar lista formateada de autos
    const tablePrices = await generateSimpleList(carArray);

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
  generateSimpleList
}; 