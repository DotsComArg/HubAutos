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

  // Mapear cada ítem sin acortar URL (usar links directos)
  const detalles = items.map(item => {
    const { price, currency, title, link, image, year, km, location, validated } = item;
    if (typeof price !== "number" && typeof price !== "string") {
      throw new TypeError(`price inválido en "${title}"`);
    }

    return { ...item };
  });

  // Seleccionar hasta 3 autos más baratos
  const sorted = [...detalles].sort((a, b) => parseInt(a.price) - parseInt(b.price));
  const seleccionados = sorted.slice(0, 3);

  // Calcular cotización estimada (promedio de los 3 precios menos 14%)
  const precios = seleccionados.map(a => parseInt(a.price)).filter(price => !isNaN(price));
  let cotizacionEstimada = null;
  if (precios.length > 0) {
    const promedio = precios.reduce((sum, price) => sum + price, 0) / precios.length;
    cotizacionEstimada = Math.round(promedio * 0.86); // Reducir 14%
  }

  // Formatear la lista de salida con formato completo
  const lines = seleccionados.map(a => {
    const priceNum = parseInt(a.price);
    const parts = [
      a.title,
      a.currency === "US$" ? `US$${priceNum.toLocaleString('en-US')}` : `$${priceNum.toLocaleString('es-AR')}`,
      a.year,
      a.km ? `${a.km} Km` : '',
      a.location || '',
      a.link // Usar link directo en lugar de acortado
    ];
    return parts.filter(Boolean).join(" | ");
  });

  // Agregar cotización estimada al final
  let listFormatted = lines.join("\n");
  if (cotizacionEstimada) {
    const currency = seleccionados[0]?.currency === "US$" ? "US$" : "$";
    const formattedPrice = currency === "US$" 
      ? `US$${cotizacionEstimada.toLocaleString('en-US')}` 
      : `$${cotizacionEstimada.toLocaleString('es-AR')}`;
    listFormatted += `\n\nCotización recomendada: ${formattedPrice}`;
  }

  return {
    listFormatted,
    autos: seleccionados,
    cotizacionEstimada
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

    if (!cheapestCarData || !cheapestCarData.vehicles || cheapestCarData.vehicles.length === 0) {
      console.log("No se encontraron autos para la búsqueda");
      return {
        success: false,
        error: "No se encontraron autos que coincidan con la búsqueda"
      };
    }

    // Usar los vehículos encontrados
    const carArray = cheapestCarData.vehicles.map(vehicle => ({
      title: vehicle.title,
      price: vehicle.price,
      currency: vehicle.currency || (parseInt(vehicle.price) > 10000 ? 'US$' : '$'),
      link: vehicle.link || '',
      image: vehicle.image || '',
      year: vehicle.year || '',
      km: vehicle.km || '',
      location: vehicle.location || '',
      validated: vehicle.validated || false
    }));

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