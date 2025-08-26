const mongoose = require('mongoose');

const formEntrySchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: Date.now,
    required: true
  },
  ano: {
    type: Number,
    required: true
  },
  modelo: {
    type: String,
    required: true
  },
  marca: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: ""
  },
  km: {
    type: Number,
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  celular: {
    type: String,
    required: true
  },
  // Campos adicionales del formulario
  telefono: String,
  postal: String,
  dni: String,
  nombre_completo: String,
  // Campos de cotización (se llenan después)
  precio_sugerido: Number,
  precio_minimo: Number,
  precio_maximo: Number,
  rango_cotizacion: String,
  // Timestamps automáticos
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'formEntrys'
});

// Índices para búsquedas eficientes
formEntrySchema.index({ fecha: -1 });
formEntrySchema.index({ marca: 1, modelo: 1 });
formEntrySchema.index({ email: 1 });
formEntrySchema.index({ celular: 1 });

// Índice único para prevenir duplicados (email + celular + fecha en el mismo día)
formEntrySchema.index(
  { 
    email: 1, 
    celular: 1, 
    fecha: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } }
  }, 
  { unique: true, name: "unique_entry_per_day" }
);

module.exports = mongoose.model('FormEntry', formEntrySchema, 'formEntrys');
