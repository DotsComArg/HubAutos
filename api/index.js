const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { KommoApiClient } = require("../classes/kommoApi");
const { LeadJsonCreator } = require("../classes/kommoJson");
const addCarRow = require('../helpers/addCarRow');
const { formatPhoneToArgentina } = require("../utils/phone");
const { processQuote } = require('../helpers/processQuote');
const urlShortener = require('../utils/urlShortener');

const { json, urlencoded } = express;
dotenv.config();

const app = express();
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

// Ruta de prueba para verificar que el servidor esté funcionando
app.get("/", (req, res) => {
  res.json({ message: "HubAutos Server está funcionando correctamente" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Servidor funcionando" });
});

function mapInputData(inputData) {
  return {
    ...inputData,
    telefono: formatPhoneToArgentina(inputData.phone),
    ano: inputData.year,
    marca: inputData.brand,
    modelo: inputData.model,
    version: inputData.version || "",
    kilometraje: inputData.km,
    codigo_postal: inputData.postal,
    nombre_completo: inputData.fullName || inputData.name
  };
}

async function processKommoLead(data) {
  try {
    if (!data.phone && !data.email) {
      throw new Error("Se requiere teléfono o email para procesar el lead");
    }

    // Esperar 20 segundos para que se cree el contacto en Kommo
    console.log("⏳ Esperando 20 segundos para que se cree el contacto en Kommo...");
    await new Promise(resolve => setTimeout(resolve, 20000));
    console.log("✅ Tiempo de espera completado, procediendo con la búsqueda de contactos...");

    const kommoApiClientWordpress = new KommoApiClient(
      process.env.SUBDOMAIN_KOMMO,
      process.env.TOKEN_KOMMO_FORM
    );
    
    let existingContact = null;
    let existingLeadId = null;
    let idLead = null;

    // Buscar contacto existente por teléfono (prioridad)
    if (data.phone) {
      const lastTenDigits = data.phone.slice(-10);
      console.log(`🔍 Buscando contacto existente por teléfono: ${lastTenDigits}`);
      
      try {
        existingContact = await kommoApiClientWordpress.getContactByPhone(lastTenDigits);
        if (existingContact) {
          console.log(`✅ Contacto existente encontrado con ID: ${existingContact.idContact}`);
          
          // Verificar si ya tiene leads activos
          if (existingContact.leads && existingContact.leads.length > 0) {
            existingLeadId = existingContact.leads[0];
            console.log(`📋 Lead existente encontrado con ID: ${existingLeadId}`);
          }
        } else {
          console.log(`❌ No se encontró contacto con el teléfono: ${lastTenDigits}`);
        }
      } catch (error) {
        console.log(`⚠️ Error buscando por teléfono: ${error.message}`);
      }
    }

    // Si no encontramos contacto por teléfono, buscar por email
    if (!existingContact && data.email) {
      console.log(`🔍 Buscando contacto existente por email: ${data.email}`);
      try {
        existingContact = await kommoApiClientWordpress.getContactByPhone(data.email);
        if (existingContact) {
          console.log(`✅ Contacto existente encontrado por email con ID: ${existingContact.idContact}`);
          
          // Verificar si ya tiene leads activos
          if (existingContact.leads && existingContact.leads.length > 0) {
            existingLeadId = existingContact.leads[0];
            console.log(`📋 Lead existente encontrado con ID: ${existingLeadId}`);
          }
        } else {
          console.log(`❌ No se encontró contacto con el email: ${data.email}`);
        }
      } catch (error) {
        console.log(`⚠️ Error buscando por email: ${error.message}`);
      }
    }

    const mappedData = mapInputData(data);

    if (existingLeadId) {
      // Actualizar lead existente con nuevos datos
      console.log("🔄 Actualizando lead existente con nuevos datos del auto...");
      const dataUpdated = new LeadJsonCreator().leadJson(mappedData);
      console.log("📝 Datos para actualizar:", JSON.stringify(dataUpdated));
      await kommoApiClientWordpress.updateLead(existingLeadId, dataUpdated[0]);
      idLead = existingLeadId;
      console.log(`✅ Lead ${idLead} actualizado exitosamente`);
      
    } else if (existingContact) {
      // Contacto existe pero no tiene leads, crear nuevo lead y vincularlo
      console.log("📋 Contacto existente sin leads, creando nuevo lead y vinculándolo...");
      const dataNewLead = new LeadJsonCreator().leadJson(mappedData);
      console.log("📝 Datos del nuevo lead:", JSON.stringify(dataNewLead));
      idLead = await kommoApiClientWordpress.createLeadSimple(dataNewLead);
      await kommoApiClientWordpress.linkLead(idLead, existingContact.idContact);
      console.log(`✅ Nuevo lead ${idLead} creado y vinculado al contacto ${existingContact.idContact}`);
      
    } else {
      // No hay contacto ni lead, crear todo desde cero
      console.log("🆕 No hay contacto existente, creando contacto y lead desde cero...");
      const dataComplex = new LeadJsonCreator().complexJson(mappedData);
      console.log("📝 Datos complejos:", JSON.stringify(dataComplex));
      const dataComplexResponse = await kommoApiClientWordpress.createLeadComplex(dataComplex);
      idLead = dataComplexResponse[0].id;
      console.log(`✅ Contacto y lead ${idLead} creados desde cero`);
    }

    // Procesar cotización automática si tenemos un lead ID
    if (idLead) {
      try {
        console.log("💰 Iniciando cotización automática para lead:", idLead);
        const quoteResult = await processQuote(mappedData);
        
        if (quoteResult.success) {
          // Agregar nota con cotizaciones
          await kommoApiClientWordpress.addNoteToLead(idLead, quoteResult.data.note);
          
          // Actualizar campos personalizados
          await kommoApiClientWordpress.updateLead(idLead, quoteResult.data.leadUpdate);
          
          console.log("✅ Cotización procesada exitosamente");
        } else {
          console.log("❌ Error en cotización:", quoteResult.error);
          // Agregar nota de error
          const errorNote = [{
            note_type: "common",
            params: {
              text: `[Error en Cotización]\n\n❌ ${quoteResult.error}\n\nNo se pudieron obtener cotizaciones automáticas.`
            }
          }];
          await kommoApiClientWordpress.addNoteToLead(idLead, errorNote);
        }
      } catch (quoteError) {
        console.error("❌ Error al procesar cotización:", quoteError);
        // No fallamos todo el proceso si la cotización falla
      }
    }

    return idLead;
  } catch (error) {
    console.error("❌ Error en processKommoLead:", error);
    throw error;
  }
}

app.post("/api/auto-quote", async (req, res) => {
  try {
    console.log("Datos recibidos desde qstash:", req.body);
    
    if (!req.body) {
      return res.status(400).json({ error: "No se recibieron datos" });
    }
    
    await addCarRow(req.body);
    const leadId = await processKommoLead(req.body);
    
    res.json({
      message: "Datos recibidos correctamente",
      data: req.body,
      leadId: leadId
    });
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint para acortar URLs
app.get("/sh/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const originalUrl = await urlShortener.getOriginalUrl(id);
    if (originalUrl) {
      res.redirect(originalUrl);
    } else {
      res.status(404).json({ error: "URL no encontrada" });
    }
  } catch (error) {
    console.error("Error al recuperar la URL original:", error);
    res.status(500).json({ error: "Error al recuperar la URL original" });
  }
});


// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
  });
}

// Para Vercel
module.exports = app;
