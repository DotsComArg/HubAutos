const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const KommoApiClient = require("../classes/kommoApi");
const cheapestCar = require("../utils/cheapest-car");
const urlShortener = require("../utils/urlShortener");
const URL_BASE = "https://hubautos.vercel.app";

const { json, urlencoded } = express;
dotenv.config();

const app = express();
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

const kommoApiClient = new KommoApiClient(
  process.env.SUBDOMAIN_KOMMO,
  process.env.TOKEN_KOMMO
);

const port = process.env.PORT || 3030;
const jsonResponse = {
  data: {
    user_id: "6509141",
    domain: "grupogf2",
    users_count: "3",
    admins: [
      {
        id: "6509141",
        name: "Fernando",
        email: "fernando@grupogf2.com.ar",
        active: "true",
        is_admin: "Y",
        phone: "+5491164776347",
      },
    ],
    account_id: "29139821",
    tariffName: "pro",
    paid_till: "true",
    current_user: {
      id: "6509141",
      name: "Fernando",
      phone: "+5491164776347",
      email: "fernando@grupogf2.com.ar",
    },
  },
  success: true,
  tariff: {
    is_active: true,
    expire_at: "11.08.2024",
    expire_at_human: "August 11, 2030",
    type: "pro",
    is_paid: true,
  },
  notifications: [],
};

async function shortUrl(fullUrl) {
  const shortId = await urlShortener.shortenUrl(fullUrl);
  console.log("ShortId generado:", shortId);
  // Opcional: construir la URL corta completa
  return `${URL_BASE}/sh/${shortId}`;
}

async function gerUrl(id) {
  const original = await urlShortener.getOriginalUrl(id);
  if (original) {
    return original;
  } else {
    console.log("No se encontró la URL original para el shortId:", id);
  }
}
/**
 * Genera una tabla de texto (ASCII) a partir de un array de objetos,
 * acortando cada URL con la función asíncrona shortUrl.
 *
 * @param {Array<Object>} items - Array de objetos con propiedades:
 *   title, link, image, price, currency, year, km, location, validated
 * @returns {Promise<string>} - La tabla formateada como texto
 */
async function generateTextTable(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  // 1. Acortamos todas las URLs en paralelo
  const rows = await Promise.all(
    items.map(async (item) => {
      const tinyLink = await shortUrl(item.link);
      return [
        item.title,
        tinyLink,
        `${item.currency}${item.price}`,
        item.year,
        item.km,
        item.location,
        item.validated ? "Yes" : "No",
      ];
    })
  );

  // 2. Definimos los encabezados
  const headers = [
    "Title",
    "Link",
    "Price",
    "Year",
    "KM",
    "Location",
    "Validated",
  ];

  // 3. Calculamos el ancho de cada columna
  const colWidths = headers.map((h, colIndex) =>
    Math.max(h.length, ...rows.map((row) => row[colIndex].length))
  );

  // Helper para rellenar texto a la derecha
  const pad = (str, width) => str + " ".repeat(width - str.length);

  // 4. Creamos la línea de encabezado y separador
  const headerLine =
    "|" + headers.map((h, i) => pad(h, colWidths[i])).join("|") + "|";
  const separatorLine =
    "|" + colWidths.map((w) => "-".repeat(w)).join("|") + "|";

  // 5. Construimos cada línea de datos
  const rowLines = rows.map(
    (row) => "|" + row.map((cell, i) => pad(cell, colWidths[i])).join("|") + "|"
  );

  // 6. Unimos todo y devolvemos
  return [headerLine, separatorLine, ...rowLines].join("\n");
}
//fucnion para obtener  cotizacion del dolar blue hoy
async function getDolarBlue() {
  try {
    const response = await fetch("https://api.bluelytics.com.ar/v2/latest");
    const data = await response.json();
    return data.blue.value_sell;
  } catch (error) {
    console.error("Error al obtener el dolar blue:", error);
    throw error;
  }
}
/**
 * Formatea un número en pesos argentinos con separador de miles.
 * Ej.: 23283000  ->  "23.283.000"
 * @param {number} n
 * @returns {string}
 */
const formatPesos = (n) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);

/**
 * Genera una lista de líneas con el formato:
 * "$<pesos> | <info extra> | <título> | <url acortada>"
 * y agrega al final "Cotización sugerida" (promedio -15%).
 *
 * @param {Array<Object>} items
 * @returns {Promise<string>}
 */
async function generateSimpleListBak(items) {
  if (!Array.isArray(items) || items.length === 0) return "";

  const dolarBlue = await getDolarBlue();
  let valorSumado = 0;

  const lines = await Promise.all(
    items.map(async ({ price, currency, title, link }) => {
      const tiny = await shortUrl(link);

      // Convertimos USD a pesos si corresponde
      if (currency === "US$") {
        const priceInPesos = Math.round(price * dolarBlue);
        valorSumado += priceInPesos;
        return `$${formatPesos(
          priceInPesos
        )} | Blue: ${dolarBlue} | ${title} | ${tiny}`;
      }

      // Precio ya está en pesos
      valorSumado += price;
      return `$${formatPesos(price)} | ${title} | ${tiny}`;
    })
  );

  // ── Cálculo del promedio y descuento del 15 % ──
  const promedio = valorSumado / items.length;
  const cotizacionSugerida = Math.round(promedio * 0.85);
  //valo maximo, restar 12%, valor minimo, restar 18%
  const valorMaximo = Math.round(promedio * 0.88);
  const valorMinimo = Math.round(promedio * 0.82);

  lines.push(`Cotización sugerida: $${formatPesos(cotizacionSugerida)}`);

  //
  const listFormatted = lines.join("\n");

  return {
    cotizacionSugerida,
    listFormatted,
    valorMaximo,
    valorMinimo
  };
}

/**
 * @typedef {Object} Item
 * @property {number} price          — Precio original.
 * @property {string} currency       — "US$" o "$".
 * @property {string} title
 * @property {string} link
 * @property {string} image
 * @property {string} year
 * @property {string} km
 * @property {string} location
 * @property {boolean} validated
 */

/**
 * Genera un listado validado de hasta 3 autos más baratos y calcula cotizaciones.
 *
 * @param {Item[]} items — Array de entre 1 y 10 autos.
 * @returns {Promise<{
 *   cotizacionSugerida: number;
 *   listFormatted: string;
 *   valorMaximo: number;
 *   valorMinimo: number;
 * }>}
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
      const tiny = await shortUrl(link);
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
      // si hay gap, avanzamos la ventana descartando el primero
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
      `${a.tiny}`
      // Para incluir la imagen en markdown: `![imagen](${a.image})`
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


//continue bot
async function continueBot({ urlContinue, status }) {
  try {
    await kommoApiClient.continueBot(urlContinue, {
      data: { status },
    });
    return;
  } catch (error) {
    console.error("Error al continuar el bot: ", error.response.data);
    throw error.response.data;
  }
}
//funccion para procesar mensaje entrante
async function processMsg(data) {
  console.log("Data del mensaje: ", data);
   const jsonleadSinResultados = {
      "pipeline_id": 7902116,
      "status_id": 88017424,
    };
  try {
    //crear query para cheapest car marca modelo y kms
    const query = `${data.marca} ${data.modelo} ${data.version} ${data.kms}`;
    const cheapestCarData = await cheapestCar({
      q: query,
      year: Number(data.year),
      usedOnly: true,
    });
    console.log("Cheapest car data: ", cheapestCarData);
    
    // Validar si cheapestCarData contiene un error o no hay resultados
    if (cheapestCarData && cheapestCarData.error) {
      console.log("Error en cheapestCarData:", cheapestCarData.error);
      await kommoApiClient.updateLead(data.leadId, jsonleadSinResultados);
      const bodyNote = [
              {
                note_type: "common",
                params: {
                  text: `❌ No se encontraron resultados para: ${data.marca} ${data.modelo} ${data.version} ${data.year} - ${data.kms}km\n\nPor favor, verifique que los datos ingresados sean correctos o intente con una búsqueda más general.\n\n Url: ${cheapestCarData.url}`,
                },
              },
            ];
            await kommoApiClient.addNoteToLead(data.leadId, bodyNote);
      throw new Error(`No se encontraron resultados: ${cheapestCarData.error}`);
    }
    
    if (!Array.isArray(cheapestCarData) || cheapestCarData.length === 0) {
      console.log("No se encontraron autos para la búsqueda");
      await kommoApiClient.updateLead(data.leadId, jsonleadSinResultados);
      const bodyNote = [
              {
                note_type: "common",
                params: {
                  text: `❌ No se encontraron resultados para: ${data.marca} ${data.modelo} ${data.version} ${data.year} - ${data.kms}km\n\nPor favor, verifique que los datos ingresados sean correctos o intente con una búsqueda más general.\n\n Url: ${cheapestCarData.url}`,
                },
              },
            ];
            await kommoApiClient.addNoteToLead(data.leadId, bodyNote);
      throw new Error("No se encontraron autos que coincidan con la búsqueda");
    }
    
    const tablePrices = await generateSimpleList(cheapestCarData);
    const jsonlead = {
      custom_fields_values: [
        {
          field_id: 1821619,
          values: [
            {
              value: tablePrices.cotizacionSugerida.toString(),
            },
          ],
        },
        {
          field_id: 1821933,
          values: [
            {
              value: tablePrices.valorMinimo.toString(),
            },
          ],
        },
        {
          field_id: 1821931,
          values: [
            {
              value: tablePrices.valorMaximo.toString(),
            },
          ],
        },
        //1821941
        {
          field_id: 1821941,
          values: [
            {
              value: "Valor sugerido desde: " +tablePrices.valorMinimo.toString()+ " hasta: "+ tablePrices.valorMaximo.toString(),
            },
          ],
        }
      ],
    };
    const bodyNote = [
      {
        note_type: "common",
        params: {
          text: tablePrices.listFormatted,
        },
      },
    ];
    //crear nota en kommo lead
    await kommoApiClient.addNoteToLead(data.leadId, bodyNote);
    //actualizar lead
    await kommoApiClient.updateLead(data.leadId, jsonlead);
    console.log("Data de cheapest car: ", tablePrices);
  } catch (error) {
    console.error(
      "Error al obtener el nombre del estado:",
      error.response ? JSON.stringify(error.response.data) : error
    );
    throw error.response ? error.response.data : error;
  }
}

// Función para limpiar los campos personalizados: elimina los items con value null y remueve campos vacíos.
function cleanCustomFields(fields) {
  return fields
    .map((field) => {
      const cleanedValues = field.values.filter((item) => item.value !== null);
      if (cleanedValues.length > 0) {
        return { ...field, values: cleanedValues };
      }
      return null; // Se elimina el campo si no quedan valores.
    })
    .filter((field) => field !== null);
}
async function initIa(data){
 
  const body = {
    contactId: data.contactId,
    message: data.message,
    leadId: data.leadId,
    phone: data.phone,
    contactName: data.contactName,
  };
  try {
    const response = await axios.post(
      "https://hubautos-ia-out.vercel.app/api/send-msg",
      body
    );
    console.log("Respuesta de IA:", response.data);
  } catch (error) {
    console.error("Error al enviar mensaje a IA:", error.response.data);
    throw error.response.data;
  }
}

async function processRequestBot(body) {
  try {
    const settingsStr = body.data.settings;
    const bodyParsed =
      typeof settingsStr === "string" ? JSON.parse(settingsStr) : settingsStr;
    const bodyFields = bodyParsed.body;
    const urlContinue = body.return_url.replace(".ru", ".com");
    const webhookName = bodyParsed.webhook_name;

    const result = {};
    for (const key in bodyFields) {
      result[key] = bodyFields[key].replace(/\\n/g, "");
    }

    if (webhookName === "cheapest-car") {
      try {
        //proceso de mensaje
        //limpiar el campo de telefono, dejar solo numeros, no espacios ni caracteres especiales
        await processMsg({ ...result });
        await continueBot({
          urlContinue,
          status: "success",
        });
      } catch (error) {
        console.error("Error al procesar cheapest-car:", error.message);
        /*
        // Si es un error de "no se encontraron resultados", agregar una nota explicativa
        if (error.message.includes("No se encontraron")) {
          try {
            const bodyNote = [
              {
                note_type: "common",
                params: {
                  text: `❌ No se encontraron resultados para: ${result.marca} ${result.modelo} ${result.version} ${result.year} - ${result.kms}km\n\nPor favor, verifique que los datos ingresados sean correctos o intente con una búsqueda más general.\n\n Url: ${error.url}`,
                },
              },
            ];
            await kommoApiClient.addNoteToLead(result.leadId, bodyNote);
          } catch (noteError) {
            console.error("Error al agregar nota de 'no resultados':", noteError);
          }
        }
        */
        await continueBot({
          urlContinue,
          status: "fail",
        });
        throw error;
      }
    } else if(webhookName === "init-ia") {
      try {
        //proceso de mensaje
        await initIa({ ...result });
        await continueBot({
          urlContinue,
          status: "success",
        });
      } catch (error) {
        await continueBot({
          urlContinue,
          status: "fail",
        });
        console.error("Error al procesar: ", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error al procesar settingsStr:", error);
    throw error;
  }
}

//endpoint filtrando el user agent
app.post(
  "/api/widget/efece_send_webhook/salesbot_request",
  async (req, res) => {
    try {
      if (req.headers["user-agent"] === "amoCRM-Webhooks/3.0") {
        console.log("Data del webhook:", req.body);
        await processRequestBot(req.body);
        res.sendStatus(200);
      } else {
        res.sendStatus(200);
      }
    } catch (error) {
      console.error("Error en el webhook:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// creo ruta para /api/account
app.post("/api/account", (req, res) => {
  res.json(jsonResponse);
});
//creo ruta para /api/onsave
app.post("/api/onsave", (req, res) => {
  res.json(jsonResponse);
});
//creo ruta para /api/onsave/efece_send_webhook
app.post("/api/onsave/efece_send_webhook", (req, res) => {
  res.json(jsonResponse);
});
//creo ruta para /api/account/efece_send_webhook
app.post("/api/account/efece_send_webhook", (req, res) => {
  res.json(jsonResponse);
});
//funcion para alargar la url
app.get("/sh/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const originalUrl = await gerUrl(id);
    if (originalUrl) {
      // Redirigir a la URL original
      res.redirect(originalUrl);
    }
  } catch (error) {
    console.error("Error al recuperar la URL original:", error);
    res.status(500).json({ error: "Error al recuperar la URL original" });
  }
});
// levanto el servidor en el puerto 3000
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
