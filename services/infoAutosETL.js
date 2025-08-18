const InfoAuto = require('../models/InfoAuto');
const InfoAutosService = require('../classes/infoAutosService');
require('dotenv').config();

class InfoAutosETL {
  constructor() {
    this.infoAutosService = new InfoAutosService();
    this.infoAutosService.initialize(
      process.env.INFOAUTOS_ACCESS_TOKEN,
      process.env.INFOAUTOS_REFRESH_TOKEN
    );
  }

  // Sincronizar todos los datos
  async syncAllData() {
    try {
      console.log('🚀 Iniciando sincronización completa de Info Autos...');
      
      // Obtener años disponibles
      const years = await this.infoAutosService.getYears();
      console.log(`📅 Años encontrados: ${years.length}`);
      
      let totalVehicles = 0;
      
      for (const yearData of years) {
        const year = yearData.id;
        console.log(`🔄 Sincronizando año ${year}...`);
        
        // Obtener marcas para este año
        const brands = await this.infoAutosService.getBrands(year);
        console.log(`  🏷️  Marcas para ${year}: ${brands.length}`);
        
        for (const brand of brands) {
          try {
            // Obtener modelos para esta marca y año
            const models = await this.infoAutosService.getModels(year, brand.id);
            console.log(`    🚗 Modelos para ${brand.name} ${year}: ${models.length}`);
            
            for (const model of models) {
              try {
                // Obtener versiones para este modelo
                const versions = await this.infoAutosService.getVersions(year, brand.id, model.id);
                console.log(`      📋 Versiones para ${model.name}: ${versions.length}`);
                
                for (const version of versions) {
                  try {
                    // Obtener datos completos del vehículo
                    const vehicleData = await this.infoAutosService.getVehicleData(year, brand.id, model.id, version.id);
                    
                    // Crear o actualizar en MongoDB
                    await this.upsertVehicle(year, brand, model, version, vehicleData);
                    totalVehicles++;
                    
                  } catch (versionError) {
                    console.error(`        ❌ Error con versión ${version.name}:`, versionError.message);
                    // Continuar con la siguiente versión
                  }
                }
                
              } catch (modelError) {
                console.error(`      ❌ Error con modelo ${model.name}:`, modelError.message);
                // Continuar con el siguiente modelo
              }
            }
            
          } catch (brandError) {
            console.error(`    ❌ Error con marca ${brand.name}:`, brandError.message);
            // Continuar con la siguiente marca
          }
        }
      }
      
      console.log(`✅ Sincronización completada. Total de vehículos: ${totalVehicles}`);
      return { success: true, totalVehicles };
      
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      throw error;
    }
  }

  // Sincronizar solo un año específico
  async syncYear(year) {
    try {
      console.log(`🔄 Sincronizando año ${year}...`);
      
      const brands = await this.infoAutosService.getBrands(year);
      let totalVehicles = 0;
      
      for (const brand of brands) {
        const models = await this.infoAutosService.getModels(year, brand.id);
        
        for (const model of models) {
          const versions = await this.infoAutosService.getVersions(year, brand.id, model.id);
          
          for (const version of versions) {
            const vehicleData = await this.infoAutosService.getVehicleData(year, brand.id, model.id, version.id);
            await this.upsertVehicle(year, brand, model, version, vehicleData);
            totalVehicles++;
          }
        }
      }
      
      console.log(`✅ Año ${year} sincronizado. Vehículos: ${totalVehicles}`);
      return { success: true, totalVehicles };
      
    } catch (error) {
      console.error(`❌ Error sincronizando año ${year}:`, error);
      throw error;
    }
  }

  // Crear o actualizar vehículo en MongoDB
  async upsertVehicle(year, brand, model, version, vehicleData) {
    const filter = {
      year: year,
      'brand.id': brand.id,
      'model.id': model.id,
      'version.id': version.id
    };
    
    const update = {
      year: year,
      brand: brand,
      model: model,
      version: version,
      vehicleData: vehicleData || {},
      lastSync: new Date(),
      source: 'infoautos'
    };
    
    await InfoAuto.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });
  }

  // Limpiar datos antiguos (opcional)
  async cleanOldData(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await InfoAuto.deleteMany({
        lastSync: { $lt: cutoffDate }
      });
      
      console.log(`🧹 Limpieza completada. Eliminados: ${result.deletedCount} registros antiguos`);
      return { success: true, deletedCount: result.deletedCount };
      
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
      throw error;
    }
  }

  // Obtener estadísticas de sincronización
  async getSyncStats() {
    try {
      const totalVehicles = await InfoAuto.countDocuments();
      const lastSync = await InfoAuto.findOne().sort({ lastSync: -1 }).select('lastSync');
      const yearsCount = await InfoAuto.distinct('year').length;
      const brandsCount = await InfoAuto.distinct('brand.id').length;
      
      return {
        totalVehicles,
        lastSync: lastSync?.lastSync,
        yearsCount,
        brandsCount
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

module.exports = InfoAutosETL;
