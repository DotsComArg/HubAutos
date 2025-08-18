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
            
            // Intentar obtener años desde la API
            try {
                const years = await this.api.getAvailableYears();
                console.log(`📅 Años obtenidos de la API:`, years);
                
                if (years && years.length > 0) {
                    return years;
                }
            } catch (error) {
                console.log(`⚠️ No se pudieron obtener años de la API:`, error.message);
            }
            
            // Fallback: generar años basados en el año actual
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let year = currentYear; year >= currentYear - 10; year--) {
                years.push({
                    id: year,
                    name: year.toString()
                });
            }
            
            console.log(`📅 Años generados como fallback:`, years);
            return years;
            
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
                // Si no hay año, usar el año actual
                year = new Date().getFullYear();
            }
            
            // Intentar obtener marcas desde la API
            try {
                const brands = await this.api.getBrandsForYear(year);
                console.log(`🏷️ Marcas obtenidas de la API:`, brands);
                
                if (brands && brands.length > 0) {
                    return brands;
                }
            } catch (error) {
                console.log(`⚠️ No se pudieron obtener marcas para ${year} desde la API:`, error.message);
            }
            
            // Fallback: marcas comunes de Argentina
            const fallbackBrands = [
                { id: 'chevrolet', name: 'Chevrolet' },
                { id: 'ford', name: 'Ford' },
                { id: 'volkswagen', name: 'Volkswagen' },
                { id: 'toyota', name: 'Toyota' },
                { id: 'honda', name: 'Honda' },
                { id: 'nissan', name: 'Nissan' },
                { id: 'fiat', name: 'Fiat' },
                { id: 'renault', name: 'Renault' },
                { id: 'peugeot', name: 'Peugeot' },
                { id: 'citroen', name: 'Citroën' }
            ];
            
            console.log(`🏷️ Marcas hardcodeadas como fallback:`, fallbackBrands);
            return fallbackBrands;
            
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
            
            // Intentar obtener modelos desde la API
            try {
                const models = await this.api.getModelsForBrandAndYear(year, brandId);
                console.log(`🚗 Modelos obtenidos de la API:`, models);
                
                if (models && models.length > 0) {
                    return models;
                }
            } catch (error) {
                console.log(`⚠️ No se pudieron obtener modelos para ${year}/${brandId} desde la API:`, error.message);
            }
            
            // Fallback: modelos básicos para la marca
            const fallbackModels = this.getFallbackModels(brandId);
            console.log(`🚗 Modelos fallback para ${brandId}:`, fallbackModels);
            return fallbackModels;
            
        } catch (error) {
            console.error('❌ Error obteniendo modelos:', error.message);
            throw new Error(`Error obteniendo modelos: ${error.message}`);
        }
    }

    // Obtener versiones para un modelo específico
    async getVersions(year, brandId, modelId) {
        try {
            console.log(`🔧 Obteniendo versiones para modelo: ${modelId}`);
            
            if (!year || !brandId || !modelId) {
                throw new Error('Se requiere año, marca y modelo para obtener versiones');
            }
            
            // Intentar obtener versiones desde la API
            try {
                const versions = await this.api.getVersionsForModel(year, brandId, modelId);
                console.log(`🔧 Versiones obtenidas de la API:`, versions);
                
                if (versions && versions.length > 0) {
                    return versions;
                }
            } catch (error) {
                console.log(`⚠️ No se pudieron obtener versiones para ${year}/${brandId}/${modelId} desde la API:`, error.message);
            }
            
            // Fallback: versiones básicas para el modelo
            const fallbackVersions = this.getFallbackVersions(modelId);
            console.log(`🔧 Versiones fallback para ${modelId}:`, fallbackVersions);
            return fallbackVersions;
            
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

    // Métodos de fallback para datos cuando la API no responde
    getFallbackModels(brandId) {
        const models = {
            chevrolet: [
                { id: 'cruze', name: 'Cruze' },
                { id: 'onix', name: 'Onix' },
                { id: 'prisma', name: 'Prisma' },
                { id: 'cobalt', name: 'Cobalt' },
                { id: 's10', name: 'S10' }
            ],
            ford: [
                { id: 'focus', name: 'Focus' },
                { id: 'fiesta', name: 'Fiesta' },
                { id: 'ranger', name: 'Ranger' },
                { id: 'ecosport', name: 'EcoSport' },
                { id: 'territory', name: 'Territory' }
            ],
            volkswagen: [
                { id: 'gol', name: 'Gol' },
                { id: 'polo', name: 'Polo' },
                { id: 'vento', name: 'Vento' },
                { id: 'amarok', name: 'Amarok' },
                { id: 'tiguan', name: 'Tiguan' }
            ],
            toyota: [
                { id: 'corolla', name: 'Corolla' },
                { id: 'yaris', name: 'Yaris' },
                { id: 'hilux', name: 'Hilux' },
                { id: 'sw4', name: 'SW4' },
                { id: 'rav4', name: 'RAV4' }
            ],
            honda: [
                { id: 'civic', name: 'Civic' },
                { id: 'city', name: 'City' },
                { id: 'hrv', name: 'HR-V' },
                { id: 'crv', name: 'CR-V' }
            ],
            nissan: [
                { id: 'sentra', name: 'Sentra' },
                { id: 'versa', name: 'Versa' },
                { id: 'frontier', name: 'Frontier' },
                { id: 'xtrail', name: 'X-Trail' }
            ],
            fiat: [
                { id: 'palio', name: 'Palio' },
                { id: 'punto', name: 'Punto' },
                { id: 'idea', name: 'Idea' },
                { id: 'doblo', name: 'Doblo' }
            ],
            renault: [
                { id: 'clio', name: 'Clio' },
                { id: 'megane', name: 'Megane' },
                { id: 'captur', name: 'Captur' },
                { id: 'koleos', name: 'Koleos' }
            ],
            peugeot: [
                { id: '208', name: '208' },
                { id: '308', name: '308' },
                { id: '2008', name: '2008' },
                { id: '3008', name: '3008' }
            ],
            citroen: [
                { id: 'c3', name: 'C3' },
                { id: 'c4', name: 'C4' },
                { id: 'c4cactus', name: 'C4 Cactus' }
            ]
        };
        
        return models[brandId] || [
            { id: 'default', name: 'Modelo estándar' }
        ];
    }

    getFallbackVersions(modelId) {
        // Versiones básicas para modelos comunes
        const versions = {
            cruze: [
                { id: 'lt', name: 'LT' },
                { id: 'ltz', name: 'LTZ' },
                { id: 'premier', name: 'Premier' }
            ],
            focus: [
                { id: 'se', name: 'SE' },
                { id: 'titanium', name: 'Titanium' },
                { id: 'st', name: 'ST' }
            ],
            gol: [
                { id: 'trend', name: 'Trend' },
                { id: 'comfortline', name: 'Comfortline' },
                { id: 'highline', name: 'Highline' }
            ],
            corolla: [
                { id: 'xe', name: 'XE' },
                { id: 'xei', name: 'XEI' },
                { id: 'xei_premium', name: 'XEI Premium' }
            ]
        };
        
        return versions[modelId] || [
            { id: 'base', name: 'Base' },
            { id: 'comfort', name: 'Comfort' },
            { id: 'premium', name: 'Premium' }
        ];
    }
}

module.exports = InfoAutosService;
