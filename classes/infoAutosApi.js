class InfoAutosApi {
  constructor() {
    // URLs separadas según la documentación de Info Autos
    this.dataBaseUrl = 'https://api.infoauto.com.ar/cars/pub';  // Para datos (years, brands, models, versions)
    this.authBaseUrl = 'https://api.infoauto.com.ar/cars/auth'; // Para autenticación (login, refresh)
    
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.lastRefreshTime = null;
    this.refreshCount = 0;
  }

  // Configurar tokens iniciales
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    // El access token expira en 1 hora, así que calculamos la expiración
    this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
  }

  // Verificar si el token está expirado (con margen de seguridad de 5 minutos)
  isTokenExpired() {
    if (!this.accessToken) return true;
    
    // Agregar margen de seguridad de 5 minutos para evitar llamadas con tokens casi expirados
    const safetyMargin = 5 * 60 * 1000; // 5 minutos
    return Date.now() >= (this.tokenExpiry - safetyMargin);
  }

  // Refrescar el token (con límites para evitar abuso)
  async refreshAccessToken() {
    // Verificar si ya refrescamos recientemente (mínimo 5 minutos entre refrescos)
    const minTimeBetweenRefreshes = 5 * 60 * 1000; // 5 minutos
    if (this.lastRefreshTime && (Date.now() - this.lastRefreshTime) < minTimeBetweenRefreshes) {
      console.log('⏳ Refresco reciente, esperando...');
      const waitTime = minTimeBetweenRefreshes - (Date.now() - this.lastRefreshTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Verificar límite de refrescos por hora (máximo 10 por hora)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (this.lastRefreshTime && this.lastRefreshTime > oneHourAgo && this.refreshCount >= 10) {
      throw new Error('Límite de refrescos por hora alcanzado. Espere antes de continuar.');
    }

    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      // Actualizar contadores
      this.lastRefreshTime = Date.now();
      this.refreshCount++;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async _performTokenRefresh() {
    try {
      console.log('🔄 Refrescando access token...');
      
      // Intentar con el endpoint estándar primero (URL correcta según documentación)
      let response = await fetch(`${this.authBaseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`
        }
      });

      // Si falla, intentar con el endpoint alternativo
      if (!response.ok) {
        console.log('🔄 Primer endpoint falló, probando alternativo...');
        response = await fetch(`${this.authBaseUrl}/token/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.refreshToken}`
          }
        });
      }

      if (!response.ok) {
        throw new Error(`Error al refrescar token: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📡 Respuesta de refresh:', data);
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
        console.log('✅ Access token refrescado exitosamente');
        return true;
      } else if (data.token) {
        // Algunas APIs usan 'token' en lugar de 'access_token'
        this.accessToken = data.token;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000);
        console.log('✅ Access token refrescado exitosamente (campo token)');
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
    // Solo refrescar si el token está realmente expirado
    if (this.isTokenExpired()) {
      console.log('🔄 Token expirado, refrescando...');
      await this.refreshAccessToken();
    } else {
      console.log('✅ Usando token existente válido');
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
      console.log(`🔑 Headers de autenticación:`, headers);
      
      // Usar la URL de datos para las consultas de catálogo
      const fullUrl = `${this.dataBaseUrl}${endpoint}`;
      console.log(`🌐 Llamando a: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      console.log(`📡 Respuesta: ${response.status} ${response.statusText}`);
      console.log(`📡 Headers de respuesta:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔄 Token expirado (401), intentando refrescar...');
          // Token expirado, intentar refrescar
          await this.refreshAccessToken();
          // Reintentar la llamada
          const retryResponse = await fetch(fullUrl, {
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
        
        // Para otros errores, intentar obtener más detalles
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = errorBody ? ` - ${errorBody}` : '';
        } catch (e) {
          // Ignorar errores al leer el body
        }
        
        throw new Error(`Error en API: ${response.status} - ${response.statusText}${errorDetails}`);
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
      // Según la documentación, usar el endpoint de marcas para obtener años
      console.log('📅 Obteniendo años desde endpoint de marcas...');
      const brandsData = await this.makeRequest('/brands/');
      console.log('🏷️ Datos de marcas obtenidos:', brandsData);
      
      if (brandsData && Array.isArray(brandsData)) {
        // Extraer años únicos de las marcas
        const years = [...new Set(brandsData.map(brand => brand.year).filter(year => year))];
        console.log('📅 Años extraídos de marcas:', years);
        
        return years.map(year => ({
          id: year,
          name: year.toString()
        }));
      }
      
      // Si no hay años en marcas, usar endpoint de año actual
      console.log('🔄 Fallback: probando endpoint de año actual...');
      try {
        const currentYear = await this.makeRequest('/current_year');
        if (currentYear) {
          return [{
            id: currentYear.toString(),
            name: currentYear.toString()
          }];
        }
      } catch (fallbackError) {
        console.log('⚠️ Endpoint de año actual también falló:', fallbackError.message);
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
      // Según la documentación, usar el endpoint de marcas
      const data = await this.makeRequest('/brands/');
      console.log(`🏷️ Todas las marcas obtenidas:`, data);
      
      if (data && Array.isArray(data)) {
        // Filtrar marcas por año si se especifica
        if (year) {
          const brandsForYear = data.filter(brand => brand.year === parseInt(year));
          console.log(`🏷️ Marcas filtradas para año ${year}:`, brandsForYear);
          return brandsForYear.map(brand => ({
            id: brand.id,
            name: brand.name
          }));
        } else {
          // Si no se especifica año, devolver todas las marcas
          return data.map(brand => ({
            id: brand.id,
            name: brand.name
          }));
        }
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
      // Según la documentación, usar el endpoint correcto para modelos
      const data = await this.makeRequest(`/brands/${brandId}/models/`);
      console.log(`🚗 Modelos obtenidos para marca ${brandId}:`, data);
      
      if (data && Array.isArray(data)) {
        // Filtrar por año si se especifica
        if (year) {
          const modelsForYear = data.filter(model => model.year === parseInt(year));
          console.log(`🚗 Modelos filtrados para año ${year}:`, modelsForYear);
          return modelsForYear.map(model => ({
            id: model.id || model.codia,
            name: model.name
          }));
        } else {
          return data.map(model => ({
            id: model.id || model.codia,
            name: model.name
          }));
        }
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
      // Según la documentación, usar el endpoint de características del modelo
      const data = await this.makeRequest(`/models/${modelId}/features/`);
      console.log(`🔧 Características obtenidas para modelo ${modelId}:`, data);
      
      if (data && Array.isArray(data)) {
        // Convertir características en versiones
        const versions = data.map(feature => ({
          id: feature.id,
          name: feature.name || feature.value
        }));
        
        console.log(`🔧 Versiones generadas para modelo ${modelId}:`, versions);
        return versions;
      }
      
      // Fallback: crear versión básica
      return [{
        id: '1',
        name: 'Versión Estándar'
      }];
    } catch (error) {
      console.error(`❌ Error obteniendo versiones para modelo ${modelId}:`, error);
      
      // Fallback: versión básica
      return [{
        id: '1',
        name: 'Versión Estándar'
      }];
    }
  }

  // Verificar estado de la conexión
  async checkConnection() {
    try {
      // Según la documentación, usar el endpoint correcto para verificar conexión
      const data = await this.makeRequest('/brands');
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

  // Obtener estadísticas de uso de tokens
  getTokenStats() {
    return {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      tokenExpiry: this.tokenExpiry,
      isExpired: this.isTokenExpired(),
      currentTime: Date.now(),
      timeUntilExpiry: this.tokenExpiry ? this.tokenExpiry - Date.now() : null,
      lastRefreshTime: this.lastRefreshTime,
      refreshCount: this.refreshCount,
      timeSinceLastRefresh: this.lastRefreshTime ? Date.now() - this.lastRefreshTime : null
    };
  }
}

module.exports = InfoAutosApi;
