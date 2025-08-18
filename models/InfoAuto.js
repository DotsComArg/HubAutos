const mongoose = require('mongoose');

const infoAutoSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    index: true
  },
  brand: {
    id: String,
    name: String
  },
  model: {
    id: String,
    name: String
  },
  version: {
    id: String,
    name: String
  },
  // Datos adicionales del vehículo
  vehicleData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Metadata
  lastSync: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'infoautos'
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas eficientes
infoAutoSchema.index({ year: 1, 'brand.id': 1 });
infoAutoSchema.index({ year: 1, 'brand.id': 1, 'model.id': 1 });
infoAutoSchema.index({ year: 1, 'brand.id': 1, 'model.id': 1, 'version.id': 1 });

// Método estático para obtener años únicos
infoAutoSchema.statics.getYears = function() {
  return this.distinct('year').sort({ year: -1 });
};

// Método estático para obtener marcas por año
infoAutoSchema.statics.getBrands = function(year) {
  return this.distinct('brand', { year: year }).then(brands => 
    brands.filter(brand => brand.id && brand.name)
  );
};

// Método estático para obtener modelos por año y marca
infoAutoSchema.statics.getModels = function(year, brandId) {
  return this.distinct('model', { 
    year: year, 
    'brand.id': brandId 
  }).then(models => 
    models.filter(model => model.id && model.name)
  );
};

// Método estático para obtener versiones por año, marca y modelo
infoAutoSchema.statics.getVersions = function(year, brandId, modelId) {
  return this.distinct('version', { 
    year: year, 
    'brand.id': brandId, 
    'model.id': modelId 
  }).then(versions => 
    versions.filter(version => version.id && version.name)
  );
};

// Método estático para obtener vehículo completo
infoAutoSchema.statics.getVehicle = function(year, brandId, modelId, versionId) {
  const query = { year, 'brand.id': brandId, 'model.id': modelId };
  if (versionId) query['version.id'] = versionId;
  
  return this.findOne(query);
};

module.exports = mongoose.model('InfoAuto', infoAutoSchema, 'info-autos');
