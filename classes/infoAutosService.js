const InfoAutosApi = require('./infoAutosApi');

class InfoAutosService {
    constructor() {
        this.api = new InfoAutosApi();
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutos
    }

    initialize(accessToken, refreshToken) {
        this.api.setTokens(accessToken, refreshToken);
    }

    getCacheKey(...params) {
        return params.join('_');
    }

    isCacheValid(key) {
        const cached = this.cache.get(key);
        return cached && (Date.now() - cached.timestamp) < this.cacheExpiry;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        return cached ? cached.data : null;
    }

    clearCache() {
        this.cache.clear();
    }

    // Obtener años disponibles
    async getYears() {
        const cacheKey = 'years';
        
        if (this.isCacheValid(cacheKey)) {
            return this.getCache(cacheKey);
        }

        try {
            const years = await this.api.getYears();
            this.setCache(cacheKey, years);
            return years;
        } catch (error) {
            throw new Error(`Error obteniendo años: ${error.message}`);
        }
    }

    // Obtener marcas por año
    async getBrands(year) {
        if (!year) {
            throw new Error('El año es requerido');
        }

        const cacheKey = this.getCacheKey('brands', year);
        
        if (this.isCacheValid(cacheKey)) {
            return this.getCache(cacheKey);
        }

        try {
            const brands = await this.api.getBrands(year);
            this.setCache(cacheKey, brands);
            return brands;
        } catch (error) {
            throw new Error(`Error obteniendo marcas para año ${year}: ${error.message}`);
        }
    }

    // Obtener modelos por marca y año
    async getModels(year, brandId) {
        if (!year || !brandId) {
            throw new Error('El año y el ID de marca son requeridos');
        }

        const cacheKey = this.getCacheKey('models', year, brandId);
        
        if (this.isCacheValid(cacheKey)) {
            return this.getCache(cacheKey);
        }

        try {
            const models = await this.api.getModels(year, brandId);
            this.setCache(cacheKey, models);
            return models;
        } catch (error) {
            throw new Error(`Error obteniendo modelos para marca ${brandId} y año ${year}: ${error.message}`);
        }
    }

    // Obtener versiones por modelo, marca y año
    async getVersions(year, brandId, modelId) {
        if (!year || !brandId || !modelId) {
            throw new Error('El año, ID de marca e ID de modelo son requeridos');
        }

        const cacheKey = this.getCacheKey('versions', year, brandId, modelId);
        
        if (this.isCacheValid(cacheKey)) {
            return this.getCache(cacheKey);
        }

        try {
            const versions = await this.api.getVersions(year, brandId, modelId);
            this.setCache(cacheKey, versions);
            return versions;
        } catch (error) {
            throw new Error(`Error obteniendo versiones para modelo ${modelId}, marca ${brandId} y año ${year}: ${error.message}`);
        }
    }

    // Obtener datos completos del vehículo
    async getVehicleData(year, brandId, modelId, versionId = null) {
        try {
            const result = {
                year: year,
                brands: await this.getBrands(year),
                models: brandId ? await this.getModels(year, brandId) : [],
                versions: (brandId && modelId) ? await this.getVersions(year, brandId, modelId) : []
            };

            if (versionId && result.versions.length > 0) {
                result.selectedVersion = result.versions.find(v => v.id == versionId);
            }

            return result;
        } catch (error) {
            throw new Error(`Error obteniendo datos del vehículo: ${error.message}`);
        }
    }

    // Buscar vehículo por texto (búsqueda fuzzy)
    async searchVehicle(searchTerm, year = null) {
        try {
            const years = year ? [year] : await this.getYears();
            const results = [];

            for (const yearItem of years) {
                const yearValue = yearItem.year || yearItem;
                const brands = await this.getBrands(yearValue);
                
                for (const brand of brands) {
                    if (brand.name && brand.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                        results.push({
                            type: 'brand',
                            year: yearValue,
                            brand: brand,
                            match: brand.name
                        });
                    }

                    const models = await this.getModels(yearValue, brand.id);
                    for (const model of models) {
                        if (model.name && model.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                            results.push({
                                type: 'model',
                                year: yearValue,
                                brand: brand,
                                model: model,
                                match: model.name
                            });
                        }
                    }
                }
            }

            return results.slice(0, 20); // Limitar a 20 resultados
        } catch (error) {
            throw new Error(`Error en búsqueda: ${error.message}`);
        }
    }

    // Validar datos del vehículo
    validateVehicleData(year, brandId, modelId, versionId = null) {
        const errors = [];

        if (!year) errors.push('El año es requerido');
        if (!brandId) errors.push('La marca es requerida');
        if (!modelId) errors.push('El modelo es requerido');
        if (versionId === '') errors.push('La versión es requerida');

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = InfoAutosService;
