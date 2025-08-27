const fs = require('fs').promises;
const path = require('path');

class VehicleDataService {
  constructor() {
    this.staticData = null;
    this.dataPath = path.join(__dirname, '../data/vehicles.json');
    this.lastLoadTime = 0;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutos
  }

  // Cargar datos estáticos desde el archivo JSON
  async loadStaticData() {
    try {
      if (this.staticData && (Date.now() - this.lastLoadTime) < this.cacheDuration) {
        return this.staticData;
      }

      const data = await fs.readFile(this.dataPath, 'utf8');
      this.staticData = JSON.parse(data);
      this.lastLoadTime = Date.now();
      
      console.log('✅ Datos estáticos cargados correctamente');
      return this.staticData;
    } catch (error) {
      console.error('❌ Error cargando datos estáticos:', error);
      throw new Error('No se pudieron cargar los datos de vehículos');
    }
  }

  // Obtener años disponibles
  async getYears() {
    try {
      const data = await this.loadStaticData();
      return data.years || [];
    } catch (error) {
      console.error('❌ Error obteniendo años:', error);
      return [];
    }
  }

  // Obtener marcas por año
  async getBrands(year) {
    try {
      const data = await this.loadStaticData();
      const brands = data.brands?.[year] || [];
      
      if (brands.length === 0) {
        console.log(`⚠️ No se encontraron marcas para el año ${year} en datos estáticos`);
        return [];
      }
      
      return brands;
    } catch (error) {
      console.error(`❌ Error obteniendo marcas para año ${year}:`, error);
      return [];
    }
  }

  // Obtener modelos por marca y año
  async getModels(year, brandId) {
    try {
      const data = await this.loadStaticData();
      const models = data.models?.[year]?.[brandId] || [];
      
      if (models.length === 0) {
        console.log(`⚠️ No se encontraron modelos para marca ${brandId} año ${year} en datos estáticos`);
        return [];
      }
      
      return models;
    } catch (error) {
      console.error(`❌ Error obteniendo modelos para marca ${brandId} año ${year}:`, error);
      return [];
    }
  }

  // Obtener versiones por modelo, marca y año
  async getVersions(year, brandId, modelId) {
    try {
      const data = await this.loadStaticData();
      const versions = data.versions?.[year]?.[brandId]?.[modelId] || [];
      
      if (versions.length === 0) {
        console.log(`⚠️ No se encontraron versiones para modelo ${modelId} marca ${brandId} año ${year} en datos estáticos`);
        return [];
      }
      
      return versions;
    } catch (error) {
      console.error(`❌ Error obteniendo versiones para modelo ${modelId}:`, error);
      return [];
    }
  }

  // Verificar si hay datos disponibles para un año específico
  hasDataForYear(year) {
    return this.staticData && this.staticData.brands && this.staticData.brands[year];
  }

  // Obtener estadísticas de datos disponibles
  getDataStats() {
    if (!this.staticData) {
      return { available: false, message: 'Datos no cargados' };
    }

    const years = Object.keys(this.staticData.brands || {});
    const totalBrands = years.reduce((total, year) => {
      return total + (this.staticData.brands[year]?.length || 0);
    }, 0);

    return {
      available: true,
      years: years.length,
      totalBrands,
      lastUpdate: this.lastLoadTime,
      cacheAge: Date.now() - this.lastLoadTime
    };
  }

  // Buscar vehículo por texto (para autocompletado)
  async searchVehicles(query, limit = 10) {
    try {
      const data = await this.loadStaticData();
      const results = [];
      const searchTerm = query.toLowerCase();

      // Buscar en años
      const matchingYears = data.years?.filter(year => 
        year.name.toLowerCase().includes(searchTerm)
      ) || [];

      // Buscar en marcas
      const matchingBrands = [];
      Object.entries(data.brands || {}).forEach(([year, brands]) => {
        brands.forEach(brand => {
          if (brand.name.toLowerCase().includes(searchTerm)) {
            matchingBrands.push({
              ...brand,
              year,
              type: 'brand'
            });
          }
        });
      });

      // Buscar en modelos
      const matchingModels = [];
      Object.entries(data.models || {}).forEach(([year, brands]) => {
        Object.entries(brands).forEach(([brandId, models]) => {
          const brandName = data.brands[year]?.find(b => b.id === brandId)?.name || '';
          models.forEach(model => {
            if (model.name.toLowerCase().includes(searchTerm)) {
              matchingModels.push({
                ...model,
                year,
                brand: brandName,
                type: 'model'
              });
            }
          });
        });
      });

      // Combinar resultados
      results.push(...matchingYears.map(y => ({ ...y, type: 'year' })));
      results.push(...matchingBrands);
      results.push(...matchingModels);

      // Limitar resultados y ordenar por relevancia
      return results.slice(0, limit).sort((a, b) => {
        // Priorizar coincidencias exactas
        const aExact = a.name.toLowerCase() === searchTerm;
        const bExact = b.name.toLowerCase() === searchTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Luego por tipo (año > marca > modelo)
        const typeOrder = { year: 1, brand: 2, model: 3 };
        return typeOrder[a.type] - typeOrder[b.type];
      });
    } catch (error) {
      console.error('❌ Error en búsqueda de vehículos:', error);
      return [];
    }
  }
}

module.exports = VehicleDataService;
