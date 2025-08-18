const axios = require('axios');

class InfoAutosApi {
    constructor() {
        this.baseURL = 'https://demo.api.infoauto.com.ar/cars/pub';
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.tokenRefreshInterval = null;
        this.isRefreshing = false;
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

        // Iniciar el cronjob de renovación automática
        this.startTokenRefreshCronjob();
    }

    startTokenRefreshCronjob() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        // Renovar token cada 50 minutos (antes de que expire a la hora)
        this.tokenRefreshInterval = setInterval(async () => {
            try {
                console.log('🔄 Cronjob: Renovando token automáticamente...');
                await this.refreshAccessToken();
                console.log('✅ Cronjob: Token renovado exitosamente');
            } catch (error) {
                console.error('❌ Cronjob: Error renovando token:', error.message);
                // Si falla, intentar nuevamente en 5 minutos
                setTimeout(async () => {
                    try {
                        await this.refreshAccessToken();
                        console.log('✅ Cronjob: Token renovado en segundo intento');
                    } catch (retryError) {
                        console.error('❌ Cronjob: Error en segundo intento:', retryError.message);
                    }
                }, 5 * 60 * 1000);
            }
        }, 50 * 60 * 1000); // 50 minutos

        console.log('⏰ Cronjob de renovación de tokens iniciado (cada 50 minutos)');
    }

    stopTokenRefreshCronjob() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
            console.log('⏰ Cronjob de renovación de tokens detenido');
        }
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            if (!this.accessToken) {
                throw new Error('No se han configurado los tokens de acceso');
            }

            // Verificar si el token ha expirado (solo como respaldo)
            if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
                console.log('🔄 Token expirado, renovando como respaldo...');
                await this.refreshAccessToken();
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
            
            // Si es error 401, intentar renovar el token una sola vez
            if (error.response?.status === 401 && !this.isRefreshing) {
                console.log('🔄 Error 401, renovando token como respaldo...');
                try {
                    this.isRefreshing = true;
                    await this.refreshAccessToken();
                    this.isRefreshing = false;
                    // Reintentar la request con el nuevo token
                    return await this.makeRequest(endpoint, method, data);
                } catch (refreshError) {
                    this.isRefreshing = false;
                    console.error('❌ Error renovando token:', refreshError.message);
                    throw new Error(`Error de autenticación: ${refreshError.message}`);
                }
            }
            
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            console.log('🔄 Renovando token de acceso...');
            
            // Usar el endpoint correcto según la documentación
            const response = await axios.post('https://demo.api.infoauto.com.ar/cars/auth/refresh', {}, {
                headers: {
                    'Authorization': `Bearer ${this.refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.access_token) {
                this.accessToken = response.data.access_token;
                this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
                console.log('✅ Token de acceso renovado exitosamente');
            } else {
                throw new Error('No se recibió access_token en la respuesta');
            }
        } catch (error) {
            console.error('❌ Error renovando token:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            throw error;
        }
    }

    // Método para actualizar tokens manualmente
    updateTokens(newAccessToken, newRefreshToken) {
        console.log('🔄 Actualizando tokens manualmente...');
        this.stopTokenRefreshCronjob(); // Detener cronjob anterior
        this.setTokens(newAccessToken, newRefreshToken); // Iniciar nuevo cronjob
        console.log('✅ Tokens actualizados manualmente');
    }

    // Método para limpiar recursos
    cleanup() {
        this.stopTokenRefreshCronjob();
        console.log('🧹 Recursos de InfoAutosApi limpiados');
    }

    // Obtener años disponibles
    async getAvailableYears() {
        return await this.makeRequest('/years/');
    }

    // Obtener marcas para un año específico
    async getBrandsForYear(year) {
        return await this.makeRequest(`/brands/${year}/`);
    }

    // Obtener modelos para una marca y año específicos
    async getModelsForBrandAndYear(year, brandId) {
        return await this.makeRequest(`/brands/${year}/${brandId}/models/`);
    }

    // Obtener versiones para un modelo específico
    async getVersionsForModel(year, brandId, modelId) {
        return await this.makeRequest(`/brands/${year}/${brandId}/models/${modelId}/versions/`);
    }

    // Obtener datos completos del vehículo
    async getVehicleData(year, brandId, modelId, versionId) {
        return await this.makeRequest(`/brands/${year}/${brandId}/models/${modelId}/versions/${versionId}/`);
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