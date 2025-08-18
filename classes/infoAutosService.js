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

    // Obtener años disponibles (usando el año actual y años anteriores)
    async getYears() {
        try {
            console.log('📅 Obteniendo años disponibles...');
            
            // Obtener archivos disponibles primero
            const archives = await this.api.getArchives();
            console.log('📁 Archivos disponibles:', archives);
            
            // Obtener años disponibles
            const years = await this.api.getAvailableYears();
            console.log('📅 Años disponibles:', years);
            
            if (years && years.results) {
                return years.results.map(year => ({
                    id: year.year,
                    name: year.year.toString()
                }));
            }
            
            return [];
        } catch (error) {
            console.error('❌ Error obteniendo años:', error.message);
            throw new Error(`Error obteniendo años: ${error.message}`);
        }
    }

    // Obtener marcas disponibles
    async getBrands(year = null) {
        try {
            console.log(`🏷️ Obteniendo marcas para año: ${year}`);
            
            if (!year) {
                // Si no hay año, obtener el año más reciente disponible
                const years = await this.getYears();
                if (years.length === 0) {
                    throw new Error('No hay años disponibles');
                }
                year = years[0].id;
            }
            
            // Obtener el mes más reciente disponible para ese año
            const months = await this.api.getAvailableMonths(year);
            console.log(`📅 Meses disponibles para ${year}:`, months);
            
            if (!months || !months.results || months.results.length === 0) {
                throw new Error(`No hay meses disponibles para el año ${year}`);
            }
            
            const latestMonth = months.results[0].month;
            console.log(`📅 Usando mes más reciente: ${latestMonth}`);
            
            // Obtener marcas para ese año y mes
            const brands = await this.api.getBrandsForYearAndMonth(year, latestMonth);
            console.log(`🏷️ Marcas obtenidas:`, brands);
            
            if (brands && brands.results) {
                return brands.results.map(brand => ({
                    id: brand.id,
                    name: brand.name
                }));
            }
            
            return [];
        } catch (error) {
            console.error('❌ Error obteniendo marcas:', error.message);
            throw new Error(`Error obteniendo marcas: ${error.message}`);
        }
    }

    // Obtener modelos por marca y año
    async getModels(year, brandId) {
        try {
            console.log(`🚗 Obteniendo modelos para año: ${year}, marca: ${brandId}`);
            
            if (!year || !brandId) {
                throw new Error('Se requiere año y marca para obtener modelos');
            }
            
            // Obtener el mes más reciente disponible para ese año
            const months = await this.api.getAvailableMonths(year);
            if (!months || !months.results || months.results.length === 0) {
                throw new Error(`No hay meses disponibles para el año ${year}`);
            }
            
            const latestMonth = months.results[0].month;
            console.log(`📅 Usando mes más reciente: ${latestMonth}`);
            
            // Obtener modelos para esa marca, año y mes
            const models = await this.api.getModelsForBrand(year, latestMonth, brandId);
            console.log(`🚗 Modelos obtenidos:`, models);
            
            if (models && models.results) {
                return models.results.map(model => ({
                    id: model.codia,
                    name: model.name,
                    brand: model.brand,
                    group: model.group
                }));
            }
            
            return [];
        } catch (error) {
            console.error('❌ Error obteniendo modelos:', error.message);
            throw new Error(`Error obteniendo modelos: ${error.message}`);
        }
    }

    // Obtener versiones (en Info Autos, las versiones son modelos específicos)
    async getVersions(year, brandId, modelId) {
        try {
            console.log(`🔧 Obteniendo versiones para modelo: ${modelId}`);
            
            if (!year || !brandId || !modelId) {
                throw new Error('Se requiere año, marca y modelo para obtener versiones');
            }
            
            // Obtener el mes más reciente disponible para ese año
            const months = await this.api.getAvailableMonths(year);
            if (!months || !months.results || months.results.length === 0) {
                throw new Error(`No hay meses disponibles para el año ${year}`);
            }
            
            const latestMonth = months.results[0].month;
            
            // Obtener características del modelo para simular versiones
            const features = await this.api.getModelFeatures(year, latestMonth, modelId);
            console.log(`🔧 Características obtenidas:`, features);
            
            if (features && features.results) {
                // Simular versiones basadas en características
                const versions = [];
                features.results.forEach(feature => {
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
            
            return [{
                id: 'default',
                name: 'Versión estándar',
                feature: 'Versión',
                value: 'Estándar'
            }];
        } catch (error) {
            console.error('❌ Error obteniendo versiones:', error.message);
            // Retornar versión por defecto en caso de error
            return [{
                id: 'default',
                name: 'Versión estándar',
                feature: 'Versión',
                value: 'Estándar'
            }];
        }
    }

    // Obtener datos completos del vehículo
    async getVehicleData(year, brandId, modelId, versionId = null) {
        try {
            const result = {
                year: year,
                brand: await this.getBrands(year).then(brands => brands.find(b => b.id === brandId)),
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

            const results = await this.api.searchModels(searchTerm, year);
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
