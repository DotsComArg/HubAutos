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
            const cacheKey = 'years';
            if (this.isCacheValid(cacheKey)) {
                return this.getCache(cacheKey);
            }

            // Obtener el año actual
            const currentYear = await this.api.getCurrentYear();
            const currentYearValue = currentYear.current_year || new Date().getFullYear();
            
            // Generar lista de años (últimos 30 años)
            const years = [];
            for (let year = currentYearValue; year >= currentYearValue - 30; year--) {
                years.push({
                    id: year,
                    name: year.toString()
                });
            }

            this.setCache(cacheKey, years);
            return years;
        } catch (error) {
            throw new Error(`Error obteniendo años: ${error.message}`);
        }
    }

    // Obtener marcas disponibles
    async getBrands(year = null) {
        try {
            const cacheKey = `brands_${year || 'all'}`;
            if (this.isCacheValid(cacheKey)) {
                return this.getCache(cacheKey);
            }

            const brands = await this.api.getBrands();
            
            // Si se especifica un año, filtrar solo las marcas que tienen precios para ese año
            if (year) {
                const filteredBrands = [];
                for (const brand of brands) {
                    try {
                        const yearsForBrand = await this.api.getYearsForBrand(brand.id);
                        if (yearsForBrand && yearsForBrand.some(y => y.year === parseInt(year))) {
                            filteredBrands.push(brand);
                        }
                    } catch (error) {
                        // Si no se pueden obtener los años, incluir la marca de todas formas
                        filteredBrands.push(brand);
                    }
                }
                this.setCache(cacheKey, filteredBrands);
                return filteredBrands;
            }

            this.setCache(cacheKey, brands);
            return brands;
        } catch (error) {
            throw new Error(`Error obteniendo marcas: ${error.message}`);
        }
    }

    // Obtener modelos por marca y año
    async getModels(year, brandId) {
        try {
            const cacheKey = `models_${year}_${brandId}`;
            if (this.isCacheValid(cacheKey)) {
                return this.getCache(cacheKey);
            }

            // Obtener modelos de la marca
            const models = await this.api.getModelsForBrand(brandId);
            
            // Si se especifica un año, filtrar solo los modelos que tienen precios para ese año
            if (year) {
                const filteredModels = [];
                for (const model of models) {
                    try {
                        const modelPrices = await this.api.getModelUsedPrices(model.codia);
                        if (modelPrices && modelPrices.some(p => p.year === parseInt(year))) {
                            filteredModels.push(model);
                        }
                    } catch (error) {
                        // Si no se pueden obtener los precios, incluir el modelo de todas formas
                        filteredModels.push(model);
                    }
                }
                this.setCache(cacheKey, filteredModels);
                return filteredModels;
            }

            this.setCache(cacheKey, models);
            return models;
        } catch (error) {
            throw new Error(`Error obteniendo modelos: ${error.message}`);
        }
    }

    // Obtener versiones (en Info Autos, las versiones son modelos específicos)
    async getVersions(year, brandId, modelId) {
        try {
            const cacheKey = `versions_${year}_${brandId}_${modelId}`;
            if (this.isCacheValid(cacheKey)) {
                return this.getCache(cacheKey);
            }

            // En Info Autos, las versiones son modelos específicos
            // Podemos obtener características técnicas del modelo para simular versiones
            const model = await this.api.getModelByCodia(modelId);
            const features = await this.api.getModelFeatures(modelId);
            
            // Crear versiones basadas en características técnicas
            const versions = [];
            if (features && features.length > 0) {
                // Agrupar por categoría de característica
                const categories = {};
                features.forEach(feature => {
                    if (!categories[feature.category_name]) {
                        categories[feature.category_name] = [];
                    }
                    categories[feature.category_name].push(feature);
                });

                // Crear versiones basadas en las características más relevantes
                Object.keys(categories).forEach(category => {
                    if (categories[category].length > 1) {
                        categories[category].forEach(feature => {
                            versions.push({
                                id: `${modelId}_${feature.id}`,
                                name: `${feature.description}`,
                                category: category
                            });
                        });
                    }
                });
            }

            // Si no hay características, crear una versión básica
            if (versions.length === 0) {
                versions.push({
                    id: `${modelId}_basic`,
                    name: 'Versión Básica',
                    category: 'General'
                });
            }

            this.setCache(cacheKey, versions);
            return versions;
        } catch (error) {
            throw new Error(`Error obteniendo versiones: ${error.message}`);
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
}

module.exports = InfoAutosService;
