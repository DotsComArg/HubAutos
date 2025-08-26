class InfoAutosApi {
  constructor() {
    this.baseUrl = 'https://api.infoauto.com.ar/cars/pub';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  // Configurar tokens iniciales
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    // El access token expira en 1 hora, así que calculamos la expiración
    this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
  }

  // Verificar si el token está expirado
  isTokenExpired() {
    return !this.accessToken || Date.now() >= this.tokenExpiry;
  }

  // Refrescar el token
  async refreshAccessToken() {
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async _performTokenRefresh() {
    try {
      console.log('🔄 Refrescando access token...');
      
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error al refrescar token: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
        console.log('✅ Access token refrescado exitosamente');
        return true;
      } else {
        throw new Error('No se recibió access token en la respuesta');
      }
    } catch (error) {
      console.error('❌ Error al refrescar access token:', error);
      throw error;
    }
  }

  // Obtener headers con autenticación
  async getAuthHeaders() {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    };
  }

  // Hacer llamada a la API con manejo de errores
  async makeRequest(endpoint, options = {}) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado, intentar refrescar
          await this.refreshAccessToken();
          // Reintentar la llamada
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
              ...(await this.getAuthHeaders()),
              ...options.headers
            }
          });

          if (!retryResponse.ok) {
            throw new Error(`Error en API: ${retryResponse.status} - ${retryResponse.statusText}`);
          }

          return await retryResponse.json();
        }
        
        throw new Error(`Error en API: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error en llamada a API ${endpoint}:`, error);
      throw error;
    }
  }

  // Obtener años disponibles
  async getYears() {
    try {
      const data = await this.makeRequest('/archives/years');
      console.log('📅 Años obtenidos:', data);
      
      if (data && Array.isArray(data)) {
        return data.map(year => ({
          id: year,
          name: year.toString()
        }));
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error obteniendo años:', error);
      throw error;
    }
  }

  // Obtener marcas por año
  async getBrands(year) {
    try {
      const data = await this.makeRequest(`/archives/years/${year}/months/1/brands`);
      console.log(`🏷️ Marcas obtenidas para año ${year}:`, data);
      
      if (data && Array.isArray(data)) {
        return data.map(brand => ({
          id: brand.id,
          name: brand.name
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error obteniendo marcas para año ${year}:`, error);
      throw error;
    }
  }

  // Obtener modelos por marca y año
  async getModels(year, brandId) {
    try {
      const data = await this.makeRequest(`/archives/years/${year}/months/1/brands/${brandId}/models`);
      console.log(`🚗 Modelos obtenidos para marca ${brandId} año ${year}:`, data);
      
      if (data && Array.isArray(data)) {
        return data.map(model => ({
          id: model.id,
          name: model.name
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error obteniendo modelos para marca ${brandId} año ${year}:`, error);
      throw error;
    }
  }

  // Obtener versiones por modelo, marca y año
  async getVersions(year, brandId, modelId) {
    try {
      const data = await this.makeRequest(`/archives/years/${year}/months/1/brands/${brandId}/groups/${modelId}/models`);
      console.log(`🔧 Versiones obtenidas para modelo ${modelId} marca ${brandId} año ${year}:`, data);
      
      if (data && Array.isArray(data)) {
        return data.map(version => ({
          id: version.id,
          name: version.name
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error obteniendo versiones para modelo ${modelId}:`, error);
      throw error;
    }
  }

  // Verificar estado de la conexión
  async checkConnection() {
    try {
      const data = await this.makeRequest('/archives');
      return {
        success: true,
        message: 'Conexión exitosa con Info Autos',
        data: data
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Info Autos',
        error: error.message
      };
    }
  }
}

module.exports = InfoAutosApi;
