const InfoAutosApi = require('../classes/infoAutosApi');
const config = require('../config/infoAutos');
const fallbackData = require('../data/fallbackData');

class VehicleDataService {
  constructor() {
    this.infoAutosApi = new InfoAutosApi();
    this.infoAutosApi.setTokens(config.ACCESS_TOKEN, config.REFRESH_TOKEN);
    this.useFallbackForYears = false;
  }

  // Obtener años disponibles
  async getYears() {
    try {
      console.log('📅 Obteniendo años desde Info Autos...');
      const years = await this.infoAutosApi.getYears();
      console.log(`✅ Años obtenidos: ${years.length}`);
      
      if (years && years.length > 0) {
        this.useFallbackForYears = false;
        return years;
      } else {
        console.log('⚠️ Info Autos devolvió array vacío para años, usando datos de fallback');
        this.useFallbackForYears = true;
        return fallbackData.years;
      }
    } catch (error) {
      console.error('❌ Error obteniendo años desde Info Autos, usando fallback:', error);
      this.useFallbackForYears = true;
      return fallbackData.years;
    }
  }

  // Obtener marcas por año
  async getBrands(year) {
    try {
      console.log(`🏷️ Obteniendo marcas para año ${year} desde Info Autos...`);
      const brands = await this.infoAutosApi.getBrands(year);
      console.log(`✅ Marcas obtenidas para año ${year}: ${brands.length}`);
      
      if (brands && brands.length > 0) {
        return brands;
      } else {
        console.log('⚠️ Info Autos devolvió marcas vacías');
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo marcas para año ${year}:`, error);
      return [];
    }
  }

  // Obtener modelos por marca y año
  async getModels(year, brandId) {
    try {
      console.log(`🚗 Obteniendo modelos para marca ${brandId} año ${year} desde Info Autos...`);
      const models = await this.infoAutosApi.getModels(year, brandId);
      console.log(`✅ Modelos obtenidos para marca ${brandId}: ${models.length}`);
      
      if (models && models.length > 0) {
        return models;
      } else {
        console.log('⚠️ Info Autos devolvió modelos vacíos');
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo modelos para marca ${brandId} año ${year}:`, error);
      return [];
    }
  }

  // Obtener TODOS los modelos de una marca (sin filtrar por año)
  async getAllModelsForBrand(brandId) {
    try {
      console.log(`🚗 Obteniendo TODOS los modelos para marca ${brandId} desde Info Autos...`);
      const models = await this.infoAutosApi.getAllModelsForBrand(brandId);
      console.log(`✅ Total de modelos obtenidos para marca ${brandId}: ${models.length}`);
      
      if (models && models.length > 0) {
        return models;
      } else {
        console.log('⚠️ Info Autos devolvió modelos vacíos');
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo todos los modelos para marca ${brandId}:`, error);
      return [];
    }
  }

  // Obtener versiones por modelo, marca y año
  async getVersions(year, brandId, modelId) {
    try {
      console.log(`🔧 Obteniendo versiones para modelo ${modelId} marca ${brandId} año ${year} desde Info Autos...`);
      const versions = await this.infoAutosApi.getVersions(year, brandId, modelId);
      console.log(`✅ Versiones obtenidas para modelo ${modelId}: ${versions.length}`);
      
      if (versions && versions.length > 0) {
        return versions;
      } else {
        console.log('⚠️ Info Autos devolvió versiones vacías');
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo versiones para modelo ${modelId}:`, error);
      return [];
    }
  }

  // Verificar estado de la conexión
  async checkConnection() {
    try {
      const result = await this.infoAutosApi.checkConnection();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Info Autos',
        error: error.message
      };
    }
  }

  // Obtener estadísticas de uso de tokens
  getTokenStats() {
    return this.infoAutosApi.getTokenStats();
  }

  // Refrescar tokens si es necesario
  async refreshTokensIfNeeded() {
    try {
      if (this.infoAutosApi.isTokenExpired()) {
        console.log('🔄 Token expirado, refrescando...');
        await this.infoAutosApi.refreshAccessToken();
        console.log('✅ Tokens refrescados correctamente');
      }
    } catch (error) {
      console.error('❌ Error refrescando tokens:', error);
      throw error;
    }
  }

  // Verificar si está usando fallback para años
  isUsingFallbackForYears() {
    return this.useFallbackForYears;
  }

  // Forzar uso de fallback para años
  forceFallbackForYears() {
    this.useFallbackForYears = true;
    console.log('🔄 Forzando uso de datos de fallback para años');
  }
}

module.exports = VehicleDataService;
