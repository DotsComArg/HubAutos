const InfoAutosApi = require('./infoAutosApi');

class InfoAutosService {
    constructor() {
        this.api = new InfoAutosApi();
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutos
    }

    initialize(accessToken, refreshToken) {
        console.log('🚀 Inicializando InfoAutosService...');
        console.log('🔑 Access Token recibido:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NO RECIBIDO');
        console.log('🔑 Refresh Token recibido:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'NO RECIBIDO');
        
        this.api.setTokens(accessToken, refreshToken);
        console.log('✅ InfoAutosService inicializado');
    }

    getCacheKey(...params) {
        return params.join('|');
    }

    isCacheValid(key) {
        if (!this.cache.has(key)) return false;
        const cached = this.cache.get(key);
        return Date.now() - cached.timestamp < this.cacheExpiry;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    getCache(key) {
        return this.cache.get(key)?.data;
    }

    clearCache() {
        this.cache.clear();
    }

    // Obtener años disponibles
    async getYears() {
        try {
            console.log('📅 Obteniendo años disponibles...');
            
            // Usar año actual y generar años anteriores
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let year = currentYear; year >= currentYear - 10; year--) {
                years.push({
                    id: year,
                    name: year.toString()
                });
            }
            
            console.log(`📅 Años generados:`, years);
            return years;
            
        } catch (error) {
            console.error('❌ Error obteniendo años:', error.message);
            throw new Error(`Error obteniendo años: ${error.message}`);
        }
    }

    // Obtener marcas disponibles
    async getBrands(year = null) {
        try {
            console.log(`🏷️ Obteniendo marcas disponibles...`);
            
            // Usar endpoint actual de marcas
            const brands = await this.api.getBrands();
            console.log(`🏷️ Marcas obtenidas de la API:`, brands);
            
            // La API devuelve directamente el array de marcas, no en results
            if (brands && Array.isArray(brands) && brands.length > 0) {
                return brands.map(brand => ({
                    id: brand.id,
                    name: brand.name
                }));
            }
            
            throw new Error('No se pudieron obtener marcas desde la API');
            
        } catch (error) {
            console.error('❌ Error obteniendo marcas:', error.message);
            throw new Error(`Error obteniendo marcas: ${error.message}`);
        }
    }

    // Obtener modelos por marca
    async getModels(year, brandId) {
        try {
            console.log(`🚗 Obteniendo modelos para marca: ${brandId}`);
            
            if (!brandId) {
                throw new Error('Se requiere marca para obtener modelos');
            }
            
            // Usar endpoint actual de modelos por marca
            const models = await this.api.getModelsByBrand(brandId);
            console.log(`🚗 Modelos obtenidos de la API:`, models);
            
            // La API devuelve directamente el array de modelos, no en results
            if (models && Array.isArray(models) && models.length > 0) {
                return models.map(model => ({
                    id: model.codia,
                    name: model.name,
                    brand: model.brand,
                    group: model.group
                }));
            }
            
            throw new Error(`No se pudieron obtener modelos para la marca ${brandId}`);
            
        } catch (error) {
            console.error('❌ Error obteniendo modelos:', error.message);
            throw new Error(`Error obteniendo modelos: ${error.message}`);
        }
    }

    // Obtener versiones para un modelo específico
    async getVersions(year, brandId, modelId) {
        try {
            console.log(`🔧 Obteniendo versiones para modelo: ${modelId}`);
            
            if (!modelId) {
                throw new Error('Se requiere modelo para obtener versiones');
            }
            
            // Usar endpoint actual de características del modelo
            const features = await this.api.getModelFeatures(modelId);
            console.log(`🔧 Características obtenidas de la API:`, features);
            
            // La API devuelve directamente el array de características, no en results
            if (features && Array.isArray(features) && features.length > 0) {
                // Simular versiones basadas en características
                const versions = [];
                features.forEach(feature => {
                    if (feature.choices && feature.choices.length > 0) {
                        feature.choices.forEach(choice => {
                            versions.push({
                                id: `${feature.id}_${choice.id}`,
                                name: `${feature.name}: ${choice.name}`,
                                feature: feature.name,
                                value: choice.name
                            });
                        });
                    }
                });
                
                // Si no hay características con opciones, crear una versión genérica
                if (versions.length === 0) {
                    versions.push({
                        id: 'default',
                        name: 'Versión estándar',
                        feature: 'Versión',
                        value: 'Estándar'
                    });
                }
                
                return versions;
            }
            
            throw new Error(`No se pudieron obtener versiones para el modelo ${modelId}`);
            
        } catch (error) {
            console.error('❌ Error obteniendo versiones:', error.message);
            throw new Error(`Error obteniendo versiones: ${error.message}`);
        }
    }

    // Obtener datos completos del vehículo
    async getVehicleData(year, brandId, modelId, versionId = null) {
        try {
            const result = {
                year: year,
                brand: await this.getBrands().then(brands => brands.find(b => b.id === brandId)),
                model: await this.getModels(year, brandId).then(models => models.find(m => m.id === modelId)),
                versions: await this.getVersions(year, brandId, modelId)
            };

            if (versionId) {
                result.selectedVersion = result.versions.find(v => v.id === versionId);
            }

            return result;
        } catch (error) {
            throw new Error(`Error obteniendo datos del vehículo: ${error.message}`);
        }
    }

    // Buscar vehículos
    async searchVehicle(searchTerm, year = null) {
        try {
            const cacheKey = `search_${searchTerm}_${year || 'all'}`;
            if (this.isCacheValid(cacheKey)) {
                return this.getCache(cacheKey);
            }

            const results = await this.api.searchModels(searchTerm);
            this.setCache(cacheKey, results);
            return results;
        } catch (error) {
            throw new Error(`Error buscando vehículo: ${error.message}`);
        }
    }

    // Validar datos del vehículo
    validateVehicleData(year, brandId, modelId, versionId = null) {
        const errors = [];

        if (!year || year < 1990 || year > new Date().getFullYear() + 1) {
            errors.push('Año inválido');
        }

        if (!brandId) {
            errors.push('Marca requerida');
        }

        if (!modelId) {
            errors.push('Modelo requerido');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Método para obtener la instancia de la API (para debugging)
    getApi() {
        return this.api;
    }

    // Método para limpiar recursos
    cleanup() {
        if (this.api) {
            this.api.cleanup();
        }
        console.log('🧹 Recursos de InfoAutosService limpiados');
    }


}

module.exports = InfoAutosService;
