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
      const years = await this.infoAutosApi.getYears();
      
      if (years && years.length > 0) {
        this.useFallbackForYears = false;
        return years;
      } else {
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
      const brands = await this.infoAutosApi.getBrands(year);
      
      if (brands && brands.length > 0) {
        return brands;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo marcas para año ${year}:`, error);
      return [];
    }
  }

  // Obtener TODAS las marcas disponibles (sin filtrar por año)
  async getAllBrands() {
    try {
      const brands = await this.infoAutosApi.getAllBrands();
      
      if (brands && brands.length > 0) {
        return brands;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo todas las marcas:`, error);
      return [];
    }
  }

  // Obtener modelos por marca y año
  async getModels(year, brandId) {
    try {
      const models = await this.infoAutosApi.getModels(year, brandId);
      
      if (models && models.length > 0) {
        return models;
      } else {
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
      const models = await this.infoAutosApi.getAllModelsForBrand(brandId);
      
      if (models && models.length > 0) {
        return models;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo todos los modelos para marca ${brandId}:`, error);
      return [];
    }
  }

  // Obtener modelos directamente usando price_at para un año específico
  async getModelsDirectWithPriceAt(brandId, year) {
    try {
      console.log(`🚗 Obteniendo modelos para marca ${brandId} año ${year} usando price_at...`);
      const models = await this.infoAutosApi.getModelsDirectWithPriceAt(brandId, year);
      console.log(`✅ Modelos obtenidos con price_at para marca ${brandId} año ${year}: ${models.length}`);
      
      if (models && models.length > 0) {
        return models;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo modelos con price_at para marca ${brandId} año ${year}:`, error);
      return [];
    }
  }

  // Obtener versiones por modelo, marca (sin filtrar por año)
  async getVersions(brandId, modelId) {
    try {
      const versions = await this.infoAutosApi.getVersions(brandId, modelId);
      
      if (versions && versions.length > 0) {
        return versions;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`❌ Error obteniendo versiones para modelo ${modelId}:`, error);
      return [];
    }
  }

  // Obtener versiones por modelo, marca y año específico
  async getVersionsByYear(brandId, modelId, year) {
    try {
      
      // Obtener todas las versiones del modelo
      const allVersions = await this.infoAutosApi.getVersions(brandId, modelId);
      
      if (!allVersions || allVersions.length === 0) {
        console.log('⚠️ No se encontraron versiones para el modelo');
        return [];
      }
      
      console.log(`📊 Total de versiones disponibles: ${allVersions.length}`);
      
      // FILTRADO ESTRICTO: Solo versiones que realmente salieron en el año especificado
      const filteredVersions = allVersions.filter(version => {
        // Verificar si tiene información de años de producción
        if (version.years && Array.isArray(version.years)) {
          return version.years.includes(parseInt(year));
        }
        
        // Verificar si tiene información de precios por año
        if (version.prices && version.prices_from && version.prices_to) {
          return year >= version.prices_from && year <= version.prices_to;
        }
        
        // Verificar si tiene descripción que mencione el año específico
        if (version.description && version.description.includes(year.toString())) {
          return true;
        }
        
        // Verificar si tiene información de producción por año
        if (version.production_years && Array.isArray(version.production_years)) {
          return version.production_years.includes(parseInt(year));
        }
        
        // Si no tiene información específica de años, NO incluirlo por defecto
        return false;
      });
      
      console.log(`📊 Versiones que realmente salieron en ${year}: ${filteredVersions.length}`);
      
      // Si no hay versiones para ese año específico, mostrar mensaje informativo
      if (filteredVersions.length === 0) {
        console.log(`⚠️ No se encontraron versiones del modelo ${modelId} que hayan salido en ${year}`);
        console.log(`💡 Esto puede indicar que el modelo no tuvo versiones en ese año específico`);
        return [];
      }
      
      console.log(`✅ Versiones confirmadas para modelo ${modelId} año ${year}: ${filteredVersions.length} de ${allVersions.length}`);
      
      return filteredVersions;
    } catch (error) {
      console.error(`❌ Error obteniendo versiones para modelo ${modelId} año ${year}:`, error);
      return [];
    }
  }

  // Obtener TODAS las versiones de un grupo de modelo (sin filtrar por año)
  async getAllVersionsForGroup(brandId, groupId) {
    try {
      
      // Obtener todas las versiones del grupo
      const allVersions = await this.infoAutosApi.getVersions(brandId, groupId);
      
      if (!allVersions || allVersions.length === 0) {
        console.log('⚠️ No se encontraron versiones para el grupo');
        return [];
      }
      
      console.log(`📊 Total de versiones disponibles para grupo ${groupId}: ${allVersions.length}`);
      
      return allVersions;
    } catch (error) {
      console.error(`❌ Error obteniendo versiones para grupo ${groupId}:`, error);
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
  }
}

module.exports = VehicleDataService;
