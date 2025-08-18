const axios = require('axios');

class InfoAutosApi {
    constructor() {
        this.baseURL = 'https://demo.api.infoauto.com.ar/cars/pub';
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
        console.log('✅ Tokens configurados:', { 
            hasAccessToken: !!this.accessToken, 
            hasRefreshToken: !!this.refreshToken,
            expiry: new Date(this.tokenExpiry).toISOString()
        });
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            if (!this.accessToken) {
                throw new Error('No se han configurado los tokens de acceso');
            }

            // Verificar si el token ha expirado
            if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
                console.log('🔄 Token expirado, pero Info Autos no tiene renovación automática');
                throw new Error('Token expirado. Por favor, renueva el token manualmente en la configuración.');
            }

            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            if (data) {
                config.data = data;
            }

            console.log(`🌐 Haciendo request a: ${config.url}`);
            console.log(`🔑 Usando token: ${this.accessToken.substring(0, 20)}...`);

            const response = await axios(config);
            console.log(`✅ Request exitoso a ${endpoint}:`, response.status);
            return response.data;
        } catch (error) {
            console.error(`❌ Error en request a ${endpoint}:`, {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            
            // Si es error 401, el token expiró
            if (error.response?.status === 401) {
                console.log('🔄 Token expirado. Info Autos no tiene renovación automática.');
                throw new Error('Token expirado. Por favor, renueva el token manualmente en la configuración.');
            }
            
            throw error;
        }
    }

    // Método para actualizar tokens manualmente
    updateTokens(newAccessToken, newRefreshToken) {
        console.log('🔄 Actualizando tokens manualmente...');
        this.setTokens(newAccessToken, newRefreshToken);
        console.log('✅ Tokens actualizados manualmente');
    }

    // Obtener archivos disponibles
    async getArchives() {
        return await this.makeRequest('/archives/');
    }

    // Obtener años disponibles
    async getAvailableYears() {
        return await this.makeRequest('/archives/years/');
    }

    // Obtener meses disponibles para un año
    async getAvailableMonths(year) {
        return await this.makeRequest(`/archives/years/${year}/months/`);
    }

    // Obtener marcas para un año y mes específicos
    async getBrandsForYearAndMonth(year, month) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/brands/`);
    }

    // Obtener años de precios para una marca específica
    async getYearsForBrand(year, month, brandId) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/brands/${brandId}/prices/`);
    }

    // Obtener grupos para una marca específica
    async getGroupsForBrand(year, month, brandId) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/brands/${brandId}/groups/`);
    }

    // Obtener modelos para una marca específica
    async getModelsForBrand(year, month, brandId) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/brands/${brandId}/models/`);
    }

    // Obtener años de precios para una marca y grupo específicos
    async getYearsForBrandAndGroup(year, month, brandId, groupId) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/brands/${brandId}/groups/${groupId}/prices/`);
    }

    // Obtener modelos para una marca y grupo específicos
    async getModelsForBrandAndGroup(year, month, brandId, groupId) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/brands/${brandId}/groups/${groupId}/models/`);
    }

    // Buscar modelos
    async searchModels(year, month, searchTerm) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/search/?q=${encodeURIComponent(searchTerm)}`);
    }

    // Obtener información completa de un modelo por CODIA
    async getModelByCodia(year, month, codia) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/models/${codia}`);
    }

    // Obtener precio 0km de un modelo
    async getModelListPrice(year, month, codia) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/models/${codia}/list_price`);
    }

    // Obtener precios usados de un modelo
    async getModelUsedPrices(year, month, codia) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/models/${codia}/prices/`);
    }

    // Obtener características técnicas de un modelo
    async getModelFeatures(year, month, codia) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/models/${codia}/features/`);
    }

    // Obtener fotos de un modelo
    async getModelPhotos(year, month, codia) {
        return await this.makeRequest(`/archives/years/${year}/months/${month}/models/${codia}/photos/`);
    }

    // Obtener todas las características disponibles
    async getAllFeatures() {
        return await this.makeRequest('/features/');
    }

    // Obtener opciones de una característica específica
    async getFeatureChoices(featureId) {
        return await this.makeRequest(`/features/${featureId}/choices/`);
    }

    // Obtener fecha de última actualización
    async getLastUpdate() {
        return await this.makeRequest('/datetime');
    }
}

module.exports = InfoAutosApi;
