const InfoAutosApi = require('../classes/infoAutosApi');
const config = require('../config/infoAutos');

class VehicleDataService {
  constructor() {
    this.infoAutosApi = new InfoAutosApi();
    this.infoAutosApi.setTokens(config.ACCESS_TOKEN, config.REFRESH_TOKEN);
  }

  // Obtener años disponibles
  async getYears() {
    try {
      console.log('📅 Obteniendo años desde Info Autos...');
      const years = await this.infoAutosApi.getYears();
      console.log(`✅ Años obtenidos: ${years.length}`);
      return years;
    } catch (error) {
      console.error('❌ Error obteniendo años:', error);
      throw error;
    }
  }

  // Obtener marcas por año
  async getBrands(year) {
    try {
      console.log(`🏷️ Obteniendo marcas para año ${year} desde Info Autos...`);
      const brands = await this.infoAutosApi.getBrands(year);
      console.log(`✅ Marcas obtenidas para año ${year}: ${brands.length}`);
      return brands;
    } catch (error) {
      console.error(`❌ Error obteniendo marcas para año ${year}:`, error);
      throw error;
    }
  }

  // Obtener modelos por marca y año
  async getModels(year, brandId) {
    try {
      console.log(`🚗 Obteniendo modelos para marca ${brandId} año ${year} desde Info Autos...`);
      const models = await this.infoAutosApi.getModels(year, brandId);
      console.log(`✅ Modelos obtenidos para marca ${brandId}: ${models.length}`);
      return models;
    } catch (error) {
      console.error(`❌ Error obteniendo modelos para marca ${brandId} año ${year}:`, error);
      throw error;
    }
  }

  // Obtener versiones por modelo, marca y año
  async getVersions(year, brandId, modelId) {
    try {
      console.log(`🔧 Obteniendo versiones para modelo ${modelId} marca ${brandId} año ${year} desde Info Autos...`);
      const versions = await this.infoAutosApi.getVersions(year, brandId, modelId);
      console.log(`✅ Versiones obtenidas para modelo ${modelId}: ${versions.length}`);
      return versions;
    } catch (error) {
      console.error(`❌ Error obteniendo versiones para modelo ${modelId}:`, error);
      throw error;
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
}

module.exports = VehicleDataService;
