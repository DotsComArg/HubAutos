const axios = require('axios');

class InfoAutosApi {
  constructor() {
    this.baseURL = 'https://api.infoauto.com.ar/cars/pub';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    // Calcular expiración (1 hora desde ahora)
    this.tokenExpiry = Date.now() + (60 * 60 * 1000);
  }

  isTokenExpired() {
    return !this.tokenExpiry || Date.now() >= this.tokenExpiry;
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          ...params,
          page: 1,
          page_size: 100 // Obtener más resultados por página
        }
      };

      console.log(`🌐 Llamando a Info Autos: ${url}`);
      const response = await axios.get(url, config);
      
      console.log(`✅ Respuesta exitosa de Info Autos: ${response.status}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error en llamada a Info Autos:`, error.response?.status, error.response?.statusText);
      throw error;
    }
  }

  // Obtener años disponibles - Extraer de /brands/ usando prices_from y prices_to
  async getYears() {
    try {
      const brands = await this.makeRequest('/brands/', {
        query_mode: 'matching',
        list_price: true,
        prices: true
      });

      if (!brands || !Array.isArray(brands)) {
        console.log('⚠️ Respuesta de brands no válida');
        return [];
      }

      // Extraer años únicos de prices_from y prices_to
      const years = new Set();
      brands.forEach(brand => {
        if (brand.prices_from && brand.prices_to) {
          for (let year = brand.prices_from; year <= brand.prices_to; year++) {
            years.add(year);
          }
        }
      });

      // Convertir a array y ordenar
      const yearsArray = Array.from(years).sort((a, b) => b - a);
      
      // Convertir a formato esperado por el frontend
      return yearsArray.map(year => ({
        id: year.toString(),
        name: year.toString()
      }));

    } catch (error) {
      console.error('❌ Error obteniendo años desde brands:', error);
      throw error;
    }
  }

  // Obtener marcas por año - Filtrar /brands/ por año usando prices_from y prices_to
  async getBrands(year) {
    try {
      const brands = await this.makeRequest('/brands/', {
        query_mode: 'matching',
        list_price: true,
        prices: true
      });

      if (!brands || !Array.isArray(brands)) {
        console.log('⚠️ Respuesta de brands no válida');
        return [];
      }

      // Filtrar marcas que tengan precios para el año especificado
      const filteredBrands = brands.filter(brand => 
        brand.prices && 
        brand.prices_from && 
        brand.prices_to && 
        year >= brand.prices_from && 
        year <= brand.prices_to
      );

      // Convertir a formato esperado por el frontend
      return filteredBrands.map(brand => ({
        id: brand.id.toString(),
        name: brand.name
      }));

    } catch (error) {
      console.error(`❌ Error obteniendo marcas para año ${year}:`, error);
      throw error;
    }
  }

  // Obtener modelos por marca y año - Usar /brands/{brand_id}/models/
  async getModels(year, brandId) {
    try {
      const models = await this.makeRequest(`/brands/${brandId}/models/`, {
        query_mode: 'matching'
      });

      if (!models || !Array.isArray(models)) {
        console.log('⚠️ Respuesta de models no válida');
        return [];
      }

      // Filtrar modelos que tengan precios para el año especificado
      const filteredModels = models.filter(model => 
        model.prices && 
        model.prices_from && 
        model.prices_to && 
        year >= model.prices_from && 
        year <= model.prices_to
      );

      // Convertir a formato esperado por el frontend
      return filteredModels.map(model => ({
        id: model.codia.toString(),
        name: model.description || model.group?.name || 'Modelo sin nombre'
      }));

    } catch (error) {
      console.error(`❌ Error obteniendo modelos para marca ${brandId} año ${year}:`, error);
      throw error;
    }
  }

  // Obtener versiones por modelo - Usar /models/{codia}/features/
  async getVersions(year, brandId, modelId) {
    try {
      console.log(`🔧 Obteniendo características para modelo ${modelId}...`);
      
      const features = await this.makeRequest(`/models/${modelId}/features/`);

      if (!features || !Array.isArray(features)) {
        console.log('⚠️ Respuesta de features no válida');
        return [];
      }

      // Filtrar solo características relevantes para el formulario
      // Priorizar características importantes como motor, transmisión, etc.
      const relevantFeatures = features.filter(feature => {
        // Incluir características importantes
        const importantCategories = ['Motor y transmisión', 'Datos técnicos'];
        const importantFeatures = ['Combustible', 'Alimentación', 'Tracción', 'Caja', 'Cilindrada', 'Potencia HP'];
        
        return importantCategories.includes(feature.category_name) || 
               importantFeatures.includes(feature.description);
      });

      // Si no hay características relevantes, usar las primeras 5 características
      const featuresToUse = relevantFeatures.length > 0 ? relevantFeatures : features.slice(0, 5);

      // Convertir características a versiones
      const versions = featuresToUse.map(feature => {
        let versionName = feature.description;
        
        // Agregar valor si es relevante
        if (feature.value_description && feature.value_description !== 'string') {
          versionName += `: ${feature.value_description}`;
        } else if (feature.value && feature.value !== 'string' && feature.value !== 0) {
          if (typeof feature.value === 'boolean') {
            versionName += `: ${feature.value ? 'Sí' : 'No'}`;
          } else {
            versionName += `: ${feature.value}`;
          }
        }

        return {
          id: feature.id.toString(),
          name: versionName
        };
      });

      console.log(`🔧 Versiones generadas para modelo ${modelId}:`, versions.length);
      return versions;

    } catch (error) {
      console.error(`❌ Error obteniendo versiones para modelo ${modelId}:`, error);
      
      // Fallback: crear versiones básicas
      console.log(`🔧 Usando versiones de fallback para modelo ${modelId}`);
      return [
        { id: "1", name: "Versión Estándar" },
        { id: "2", name: "Versión Premium" },
        { id: "3", name: "Versión Sport" }
      ];
    }
  }

  // Verificar conexión
  async checkConnection() {
    try {
      const response = await this.makeRequest('/brands/', { page_size: 1 });
      return {
        success: true,
        message: 'Conexión exitosa con Info Autos',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Info Autos',
        error: error.message
      };
    }
  }

  // Obtener estadísticas de tokens
  getTokenStats() {
    return {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      isExpired: this.isTokenExpired(),
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null
    };
  }

  // Refrescar token de acceso
  async refreshAccessToken() {
    try {
      console.log('🔄 Refrescando token de acceso...');
      
      const response = await axios.post('https://api.infoauto.com.ar/auth/refresh', {
        refresh_token: this.refreshToken
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
        console.log('✅ Token refrescado correctamente');
        return true;
      } else {
        throw new Error('No se recibió nuevo access_token');
      }
    } catch (error) {
      console.error('❌ Error refrescando token:', error);
      throw error;
    }
  }
}

module.exports = InfoAutosApi;
