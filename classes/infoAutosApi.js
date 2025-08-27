const axios = require('axios');
const config = require('../config/infoAutos');

class InfoAutosApi {
  constructor() {
    this.baseURL = 'https://api.infoauto.com.ar/cars/pub';
    this.authURL = 'https://api.infoauto.com.ar/cars/auth';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.refreshTokenExpiry = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.isLoggingIn = false;
    this.loginPromise = null;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    // Calcular expiración (1 hora desde ahora)
    this.tokenExpiry = Date.now() + (60 * 60 * 1000);
    // Calcular expiración del refresh token (24 horas desde ahora)
    this.refreshTokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
  }

  isTokenExpired() {
    // Agregar margen de seguridad de 5 minutos para evitar llamadas con tokens casi expirados
    const safetyMargin = 5 * 60 * 1000; // 5 minutos
    return !this.tokenExpiry || Date.now() >= (this.tokenExpiry - safetyMargin);
  }

  isRefreshTokenExpired() {
    // Agregar margen de seguridad de 1 hora para el refresh token
    const safetyMargin = 60 * 60 * 1000; // 1 hora
    return !this.refreshTokenExpiry || Date.now() >= (this.refreshTokenExpiry - safetyMargin);
  }

  // Renovar token automáticamente si es necesario
  async ensureValidToken() {
    // Si el token está expirado o por expirar, renovarlo
    if (this.isTokenExpired()) {
      console.log('🔄 Token expirado o por expirar, renovando...');
      
      // Si ya estamos refrescando, esperar a que termine
      if (this.isRefreshing) {
        console.log('⏳ Ya se está renovando el token, esperando...');
        return this.refreshPromise;
      }

      // Si ya estamos haciendo login, esperar a que termine
      if (this.isLoggingIn) {
        console.log('⏳ Ya se está haciendo login, esperando...');
        return this.loginPromise;
      }

      // Iniciar renovación
      this.isRefreshing = true;
      this.refreshPromise = this.refreshAccessToken();
      
      try {
        await this.refreshPromise;
        console.log('✅ Token renovado exitosamente');
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    } else {
      console.log('✅ Usando token existente válido');
    }
  }

  async makeRequest(endpoint, params = {}) {
    try {
      // Asegurar que tenemos un token válido antes de hacer la llamada
      await this.ensureValidToken();
      
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
      // Si es error 401, intentar renovar el token y reintentar
      if (error.response?.status === 401) {
        console.log('🔄 Error 401, intentando renovar token y reintentar...');
        
        try {
          await this.refreshAccessToken();
          // Reintentar la llamada con el nuevo token
          const retryConfig = {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${this.accessToken}`
            },
            params: {
              ...params,
              page: 1,
              page_size: 100
            }
          };
          
          const retryResponse = await axios.get(`${this.baseURL}${endpoint}`, retryConfig);
          console.log(`✅ Reintento exitoso: ${retryResponse.status}`);
          return retryResponse.data;
        } catch (refreshError) {
          console.error('❌ Error renovando token:', refreshError);
          throw error; // Lanzar el error original si falla la renovación
        }
      }
      
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

      // Agrupar modelos por grupo base para evitar duplicados
      const groupedModels = new Map();
      
      filteredModels.forEach(model => {
        const groupKey = model.group?.name || 'Sin grupo';
        const groupId = model.group?.id || '0';
        
        if (!groupedModels.has(groupKey)) {
          groupedModels.set(groupKey, {
            id: groupId,
            name: groupKey,
            fullDescription: model.description || 'Modelo sin nombre'
          });
        }
      });

      // Convertir a formato esperado por el frontend
      return Array.from(groupedModels.values()).map(model => ({
        id: model.id.toString(),
        name: model.name
      }));

    } catch (error) {
      console.error(`❌ Error obteniendo modelos para marca ${brandId} año ${year}:`, error);
      throw error;
    }
  }

  // Obtener versiones por modelo - Usar /brands/{brand_id}/models/ y filtrar por grupo
  async getVersions(year, brandId, modelId) {
    try {
      console.log(`🔧 Obteniendo versiones para grupo de modelo ${modelId}...`);
      
      // Obtener todos los modelos de la marca para encontrar las versiones del grupo
      const models = await this.makeRequest(`/brands/${brandId}/models/`, {
        query_mode: 'matching'
      });

      if (!models || !Array.isArray(models)) {
        console.log('⚠️ Respuesta de models no válida');
        return [];
      }

      // Obtener el nombre del grupo para extraerlo de las descripciones
      const groupModel = models.find(model => 
        model.group?.id?.toString() === modelId
      );
      const groupName = groupModel?.group?.name || '';

      // Filtrar modelos que pertenezcan al grupo seleccionado y tengan precios para el año
      const versions = models.filter(model => 
        model.group?.id?.toString() === modelId &&
        model.prices && 
        model.prices_from && 
        model.prices_to && 
        year >= model.prices_from && 
        year <= model.prices_to
      );

      // Convertir a formato esperado por el frontend
      const formattedVersions = versions.map(model => {
        let versionName = model.description || 'Versión sin nombre';
        
        // Remover el nombre del modelo del inicio de la descripción
        if (groupName && versionName.startsWith(groupName)) {
          versionName = versionName.substring(groupName.length).trim();
          // Si queda vacío o solo espacios, usar la descripción completa
          if (!versionName) {
            versionName = model.description || 'Versión sin nombre';
          }
        }

        return {
          id: model.codia.toString(),
          name: versionName
        };
      });

      console.log(`🔧 Versiones encontradas para grupo ${modelId}:`, formattedVersions.length);
      return formattedVersions;

    } catch (error) {
      console.error(`❌ Error obteniendo versiones para grupo ${modelId}:`, error);
      
      // Fallback: crear versiones básicas
      console.log(`🔧 Usando versiones de fallback para grupo ${modelId}`);
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
      isRefreshTokenExpired: this.isRefreshTokenExpired(),
      accessTokenExpiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      refreshTokenExpiresAt: this.refreshTokenExpiry ? new Date(this.refreshTokenExpiry).toISOString() : null,
      isRefreshing: this.isRefreshing,
      isLoggingIn: this.isLoggingIn
    };
  }

  // Refrescar token de acceso
  async refreshAccessToken() {
    try {
      console.log('🔄 Refrescando token de acceso...');
      
      // Si el refresh token está expirado, hacer login completo
      if (this.isRefreshTokenExpired()) {
        console.log('⚠️ Refresh token expirado, haciendo login completo...');
        return await this.login();
      }
      
      const response = await axios.post(config.REFRESH_URL, {
        refresh_token: this.refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
        console.log('✅ Token refrescado correctamente');
        return true;
      } else {
        throw new Error('No se recibió nuevo access_token en la respuesta');
      }
    } catch (error) {
      console.error('❌ Error refrescando token:', error.response?.data || error.message);
      
      // Si el refresh falla, intentar login completo
      if (error.response?.status === 401) {
        console.log('🔄 Refresh token inválido, intentando login completo...');
        return await this.login();
      }
      
      throw error;
    }
  }

  // Login completo para obtener nuevos tokens
  async login() {
    try {
      console.log('🔐 Haciendo login completo para obtener nuevos tokens...');
      
      // Si ya estamos haciendo login, esperar a que termine
      if (this.isLoggingIn) {
        console.log('⏳ Ya se está haciendo login, esperando...');
        return this.loginPromise;
      }

      // Iniciar login
      this.isLoggingIn = true;
      this.loginPromise = this.performLogin();
      
      try {
        const result = await this.loginPromise;
        console.log('✅ Login completado exitosamente');
        return result;
      } finally {
        this.isLoggingIn = false;
        this.loginPromise = null;
      }
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  }

  // Realizar login con credenciales
  async performLogin() {
    try {
      // Crear Basic Auth header
      const credentials = `${config.USERNAME}:${config.PASSWORD}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');
      
      const response = await axios.post(config.LOGIN_URL, {}, {
        headers: {
          'Authorization': `Basic ${base64Credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.access_token && response.data.refresh_token) {
        // Actualizar tokens
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hora
        this.refreshTokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
        
        console.log('✅ Nuevos tokens obtenidos por login');
        console.log(`📅 Access token expira: ${new Date(this.tokenExpiry).toISOString()}`);
        console.log(`📅 Refresh token expira: ${new Date(this.refreshTokenExpiry).toISOString()}`);
        
        return true;
      } else {
        throw new Error('No se recibieron tokens en la respuesta de login');
      }
    } catch (error) {
      console.error('❌ Error en performLogin:', error.response?.data || error.message);
      throw new Error(`Error de login: ${error.response?.status || 'Sin respuesta'} - ${error.message}`);
    }
  }
}

module.exports = InfoAutosApi;
