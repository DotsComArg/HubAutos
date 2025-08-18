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
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            if (!this.accessToken) {
                throw new Error('No se han configurado los tokens de acceso');
            }

            if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
                await this.refreshAccessToken();
            }

            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`Error en request a ${endpoint}:`, error.message);
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await axios.post(`${this.baseURL}/auth/refresh`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.access_token) {
                this.accessToken = response.data.access_token;
                this.tokenExpiry = Date.now() + (60 * 60 * 1000);
                console.log('✅ Token de acceso renovado');
            }
        } catch (error) {
            console.error('❌ Error renovando token:', error.message);
            throw error;
        }
    }

    // Obtener el año actual
    async getCurrentYear() {
        return await this.makeRequest('/current_year');
    }

    // Obtener todas las marcas
    async getBrands() {
        return await this.makeRequest('/brands/');
    }

    // Obtener años disponibles para una marca específica
    async getYearsForBrand(brandId) {
        return await this.makeRequest(`/brands/${brandId}/prices/`);
    }

    // Obtener grupos de una marca
    async getGroupsForBrand(brandId) {
        return await this.makeRequest(`/brands/${brandId}/groups/`);
    }

    // Obtener modelos de una marca
    async getModelsForBrand(brandId) {
        return await this.makeRequest(`/brands/${brandId}/models/`);
    }

    // Obtener modelos de una marca y grupo específicos
    async getModelsForBrandAndGroup(brandId, groupId) {
        return await this.makeRequest(`/brands/${brandId}/groups/${groupId}/models/`);
    }

    // Obtener años disponibles para una marca y grupo específicos
    async getYearsForBrandAndGroup(brandId, groupId) {
        return await this.makeRequest(`/brands/${brandId}/groups/${groupId}/prices/`);
    }

    // Buscar modelos
    async searchModels(searchTerm, year = null) {
        let endpoint = `/search/?q=${encodeURIComponent(searchTerm)}`;
        if (year) {
            endpoint += `&year=${year}`;
        }
        return await this.makeRequest(endpoint);
    }

    // Obtener información completa de un modelo por CODIA
    async getModelByCodia(codia) {
        return await this.makeRequest(`/models/${codia}`);
    }

    // Obtener precio 0km de un modelo
    async getModelListPrice(codia) {
        return await this.makeRequest(`/models/${codia}/list_price`);
    }

    // Obtener precios usados de un modelo
    async getModelUsedPrices(codia) {
        return await this.makeRequest(`/models/${codia}/prices/`);
    }

    // Obtener características técnicas de un modelo
    async getModelFeatures(codia) {
        return await this.makeRequest(`/models/${codia}/features/`);
    }

    // Obtener fotos de un modelo
    async getModelPhotos(codia) {
        return await this.makeRequest(`/models/${codia}/photos/`);
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
