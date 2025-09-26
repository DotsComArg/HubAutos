const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { KommoApiClient } = require("../classes/kommoApi");
const { LeadJsonCreator } = require("../classes/kommoJson");
const { formatPhoneToArgentina } = require("../utils/phone");
const { processQuote } = require('../helpers/processQuote');
const urlShortener = require('../utils/urlShortener');
const MongoService = require('../services/mongoService');
const formEntryRoutes = require('./formEntryRoutes');
const infoAutosRoutes = require('./infoAutosRoutes');
const vehicleDataRoutes = require('./vehicleDataRoutes');

const { json, urlencoded } = express;
dotenv.config();

const app = express();
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Rutas de formEntrys - Backend con paginación implementado
app.use('/api/form-entries', formEntryRoutes);

// Rutas de Info Autos API
app.use('/api/infoautos', infoAutosRoutes);

// Rutas de datos de vehículos (Info Autos)
app.use('/api/vehicles', vehicleDataRoutes);

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

    // Función para consolidar contactos duplicados
    async function consolidateDuplicateContacts(phone) {
      const lastTenDigits = phone.slice(-10);
      console.log(`🔍 Buscando y consolidando contactos duplicados con número: ${lastTenDigits}`);
      
      try {
        // Buscar leads que tengan este teléfono
        const searchResult = await kommoApiClientWordpress.searchLeadsByPhone(lastTenDigits);
        if (searchResult) {
          console.log(`✅ Encontrado lead existente con ID: ${searchResult.leadId} y contacto: ${searchResult.contactId}`);
          return {
            contactId: searchResult.contactId,
            leadId: searchResult.leadId,
            found: true
          };
        }
        
        // Si no hay leads, buscar contactos directamente
        const contactResult = await kommoApiClientWordpress.getContactByPhone(lastTenDigits);
        if (contactResult) {
          console.log(`✅ Encontrado contacto existente con ID: ${contactResult.idContact}`);
          
          // Verificar si ya tiene leads activos
          if (contactResult.leads && contactResult.leads.length > 0) {
            const leadId = contactResult.leads[0];
            console.log(`📋 Lead existente encontrado con ID: ${leadId}`);
            return {
              contactId: contactResult.idContact,
              leadId: leadId,
              found: true
            };
          } else {
            return {
              contactId: contactResult.idContact,
              leadId: null,
              found: true
            };
          }
        }
        
        return { found: false };
      } catch (error) {
        console.log(`⚠️ Error consolidando contactos: ${error.message}`);
        return { found: false, error: error.message };
      }
    }

    // Buscar y consolidar contactos duplicados por teléfono
    if (data.phone) {
      const consolidationResult = await consolidateDuplicateContacts(data.phone);
      if (consolidationResult.found) {
        existingContact = { idContact: consolidationResult.contactId };
        existingLeadId = consolidationResult.leadId;
        console.log(`✅ Contacto consolidado - ID: ${consolidationResult.contactId}, Lead: ${consolidationResult.leadId || 'No tiene'}`);
      } else {
        console.log(`❌ No se encontraron contactos con el teléfono: ${data.phone}`);
      }
    }

    // Si no encontramos contacto por teléfono, buscar por email
    if (!existingContact && data.email) {
      console.log(`🔍 Buscando contacto existente por email: ${data.email}`);
      try {
        const emailContact = await kommoApiClientWordpress.getContactByEmail(data.email);
        if (emailContact) {
          console.log(`✅ Contacto existente encontrado por email con ID: ${emailContact.idContact}`);
          
          // Verificar si ya tiene leads activos
          if (emailContact.leads && emailContact.leads.length > 0) {
            existingLeadId = emailContact.leads[0];
            console.log(`📋 Lead existente encontrado con ID: ${existingLeadId}`);
          }
          existingContact = { idContact: emailContact.idContact };
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

    // TEMPORALMENTE DESACTIVADO - Apify y notas
    if (idLead) {
      // Detectar número de prueba para activar Apify
      const phoneNumber = data.phone || data.telefono || '';
      const cleanPhone = phoneNumber.replace(/[^\d]/g, ''); // Remover todo excepto dígitos
      const isTestNumber = cleanPhone === '3794556599' || cleanPhone.endsWith('3794556599');
      
      if (isTestNumber) {
        console.log("🧪 Número de prueba detectado - Activando Apify y cotización");
        // Ejecutar cotización en paralelo (no bloquear respuesta)
        processQuote(mappedData)
          .then(async (quoteResult) => {
            if (quoteResult.success) {
              console.log("✅ Cotización completada para número de prueba");
              // Agregar nota con cotización
              const bodyNote = [{
                note_type: "common",
                params: {
                  text: `[Cotización Automática - TEST]\n\n${quoteResult.data.cotizacion.listFormatted}`
                }
              }];
              await kommoApiClientWordpress.addNoteToLead(idLead, bodyNote);
            } else {
              console.log("❌ Error en cotización para número de prueba:", quoteResult.error);
            }
          })
          .catch(error => {
            console.error("❌ Error ejecutando cotización para número de prueba:", error);
          });
      } else {
        console.log("⏸️ Apify y cotización TEMPORALMENTE DESACTIVADOS para ajustes");
      }
      
      console.log("✅ Lead creado/actualizado exitosamente:", idLead);
      
      // TODO: Reactivar cuando termines los ajustes del scraper
      /*
      // Ejecutar cotización en paralelo (no bloquear respuesta)
      processQuote(mappedData)
        .then(async (quoteResult) => {
          // ... código de cotización comentado temporalmente
        });
      */
    }

    return idLead;
  } catch (error) {
    console.error("❌ Error en processKommoLead:", error);
    throw error;
  }
}

app.post("/api/auto-quote", async (req, res) => {
  try {
    console.log("🚀 POST /api/auto-quote - Iniciando procesamiento");
    console.log("📊 Datos recibidos:", JSON.stringify(req.body, null, 2));
    
    if (!req.body) {
      return res.status(400).json({ error: "No se recibieron datos" });
    }
    
    // Verificar si ya se procesó esta solicitud (prevenir duplicados)
    const requestId = `${req.body.email}-${req.body.phone}-${Date.now()}`;
    console.log("�� ID de solicitud:", requestId);
    
    
    // Guardar en MongoDB
    console.log("🗄️ Guardando en MongoDB...");
    const mongoService = new MongoService();
    const mongoEntry = await mongoService.saveFormEntry(req.body);
    console.log("✅ MongoDB - Completado, ID:", mongoEntry._id);
    
    // Procesar en Kommo
    console.log("📋 Procesando en Kommo CRM...");
    const leadId = await processKommoLead(req.body);
    console.log("✅ Kommo CRM - Completado, Lead ID:", leadId);
    
    console.log("🎉 Procesamiento completado exitosamente");
    
    res.json({
      message: "Datos recibidos correctamente",
      data: req.body,
      leadId: leadId,
      mongoId: mongoEntry._id,
      requestId: requestId
    });
  } catch (error) {
    console.error("❌ Error al procesar la solicitud:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint para procesar cotización manualmente (backup)
app.post("/api/process-quote", async (req, res) => {
  try {
    console.log("🚀 POST /api/process-quote - Procesando cotización manual");
    console.log("📊 Datos recibidos:", JSON.stringify(req.body, null, 2));
    
    if (!req.body || !req.body.leadId) {
      return res.status(400).json({ 
        success: false,
        error: "leadId es requerido" 
      });
    }
    
    const { leadId, vehicleData } = req.body;
    
    if (!vehicleData) {
      return res.status(400).json({ 
        success: false,
        error: "vehicleData es requerido" 
      });
    }
    
    console.log("💰 Procesando cotización para lead:", leadId);
    const quoteResult = await processQuote(vehicleData);
    
    if (quoteResult.success) {
      // Crear cliente de Kommo
      const kommoApiClientWordpress = new KommoApiClient(
        process.env.SUBDOMAIN_KOMMO,
        process.env.TOKEN_KOMMO_FORM
      );
      
      // Agregar nota con cotizaciones
      await kommoApiClientWordpress.addNoteToLead(leadId, quoteResult.data.note);
      
      // Actualizar campos personalizados
      if (quoteResult.data.leadUpdate) {
        await kommoApiClientWordpress.updateLead(leadId, quoteResult.data.leadUpdate);
      }
      
      console.log("✅ Cotización manual procesada exitosamente");
      
      res.json({
        success: true,
        message: "Cotización procesada exitosamente",
        leadId: leadId,
        data: quoteResult.data
      });
    } else {
      console.log("❌ Error en cotización manual:", quoteResult.error);
      
      // Crear cliente de Kommo para agregar nota de error
      const kommoApiClientWordpress = new KommoApiClient(
        process.env.SUBDOMAIN_KOMMO,
        process.env.TOKEN_KOMMO_FORM
      );
      
      const errorNote = [{
        note_type: "common",
        params: {
          text: `[Error en Cotización Manual]\n\n❌ ${quoteResult.error}\n\nNo se pudieron obtener cotizaciones automáticas.`
        }
      }];
      await kommoApiClientWordpress.addNoteToLead(leadId, errorNote);
      
      res.status(400).json({
        success: false,
        error: quoteResult.error,
        leadId: leadId
      });
    }
  } catch (error) {
    console.error("❌ Error al procesar cotización manual:", error);
    res.status(500).json({ 
      success: false,
      error: "Error interno del servidor",
      details: error.message
    });
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
// Versión funcional restaurada - Apify funciona correctamente dentro de processKommoLead
module.exports = app;
