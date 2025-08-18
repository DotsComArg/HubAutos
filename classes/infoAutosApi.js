const axios = require('axios');

class InfoAutosApi {
    constructor() {
        this.baseURL = 'https://api.infoautos.com.ar';
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hora
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            if (!this.accessToken || Date.now() >= this.tokenExpiry) {
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

            if (data && method !== 'GET') {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('Error en Info Autos API:', error.response?.data || error.message);
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await axios.post(`${this.baseURL}/auth/refresh`, {
                refresh_token: this.refreshToken
            });
            
            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (3600 * 1000);
        } catch (error) {
            console.error('Error refrescando token:', error.response?.data || error.message);
            throw error;
        }
    }

    // Obtener años disponibles
    async getYears() {
        try {
            const response = await this.makeRequest('/years');
            return response.data || response;
        } catch (error) {
            throw new Error(`Error obteniendo años: ${error.message}`);
        }
    }

    // Obtener marcas por año
    async getBrands(year) {
        try {
            const response = await this.makeRequest(`/brands?year=${year}`);
            return response.data || response;
        } catch (error) {
            throw new Error(`Error obteniendo marcas para año ${year}: ${error.message}`);
        }
    }

    // Obtener modelos por marca y año
    async getModels(year, brandId) {
        try {
            const response = await this.makeRequest(`/models?year=${year}&brand_id=${brandId}`);
            return response.data || response;
        } catch (error) {
            throw new Error(`Error obteniendo modelos para marca ${brandId} y año ${year}: ${error.message}`);
        }
    }

    // Obtener versiones por modelo, marca y año
    async getVersions(year, brandId, modelId) {
        try {
            const response = await this.makeRequest(`/versions?year=${year}&brand_id=${brandId}&model_id=${modelId}`);
            return response.data || response;
        } catch (error) {
            throw new Error(`Error obteniendo versiones para modelo ${modelId}, marca ${brandId} y año ${year}: ${error.message}`);
        }
    }

    // Obtener todos los datos en cascada
    async getVehicleData(year, brandId, modelId, versionId = null) {
        try {
            const result = {
                year: year,
                brands: await this.getBrands(year),
                models: brandId ? await this.getModels(year, brandId) : [],
                versions: (brandId && modelId) ? await this.getVersions(year, brandId, modelId) : []
            };

            if (versionId) {
                result.selectedVersion = result.versions.find(v => v.id === versionId);
            }

            return result;
        } catch (error) {
            throw new Error(`Error obteniendo datos del vehículo: ${error.message}`);
        }
    }
}

module.exports = InfoAutosApi;
