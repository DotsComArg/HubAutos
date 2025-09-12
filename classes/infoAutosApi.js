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
      
      // Si ya estamos refrescando, esperar a que termine
      if (this.isRefreshing) {
        return this.refreshPromise;
      }

      // Si ya estamos haciendo login, esperar a que termine
      if (this.isLoggingIn) {
        return this.loginPromise;
      }

      // Iniciar renovación
      this.isRefreshing = true;
      this.refreshPromise = this.refreshAccessToken();
      
      try {
        await this.refreshPromise;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    } else {
    }
  }

  async makeRequest(endpoint, params = {}, getHeaders = false) {
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
          ...params
        }
      };

      const response = await axios.get(url, config);
      
      // Si se solicitan headers, devolver tanto datos como headers
      if (getHeaders) {
        return {
          data: response.data,
          headers: response.headers
        };
      }
      
      return response.data;
    } catch (error) {
      // Si es error 401, intentar renovar el token y reintentar
      if (error.response?.status === 401) {
        
        try {
          await this.refreshAccessToken();
          // Reintentar la llamada con el nuevo token
          const retryConfig = {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${this.accessToken}`
            },
            params: {
              ...params
            }
          };
          
          const retryResponse = await axios.get(`${this.baseURL}${endpoint}`, retryConfig);
          
          // Si se solicitan headers, devolver tanto datos como headers
          if (getHeaders) {
            return {
              data: retryResponse.data,
              headers: retryResponse.headers
            };
          }
          
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

  // Obtener TODAS las marcas disponibles (sin filtrar por año)
  async getAllBrands() {
    try {
      
      let allBrands = [];
      let currentPage = 1;
      let totalPages = 1;
      
      // Primera llamada para obtener headers de paginación
      const firstResponse = await this.makeRequest('/brands/', {
        query_mode: 'matching',
        list_price: true,
        prices: true,
        page: currentPage,
        page_size: 20
      }, true); // getHeaders = true para obtener los headers
      
      if (firstResponse.data && Array.isArray(firstResponse.data)) {
        allBrands = firstResponse.data;
        
        // Extraer información de paginación del header x-pagination
        if (firstResponse.headers && firstResponse.headers['x-pagination']) {
          try {
            const paginationInfo = JSON.parse(firstResponse.headers['x-pagination']);
            totalPages = paginationInfo.total_pages;
          } catch (parseError) {
            console.warn('⚠️ No se pudo parsear header de paginación:', parseError);
          }
        }
        
        // Obtener páginas restantes
        while (currentPage < totalPages) {
          currentPage++;
          
          try {
            const nextPageData = await this.makeRequest('/brands/', {
              query_mode: 'matching',
              list_price: true,
              prices: true,
              page: currentPage,
              page_size: 20
            });
            
            if (nextPageData && Array.isArray(nextPageData)) {
              allBrands = allBrands.concat(nextPageData);
            }
            
            // Rate limiting - esperar 100ms entre requests
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (pageError) {
            console.error(`❌ Error obteniendo página ${currentPage}:`, pageError);
            break; // Salir del loop si hay error
          }
        }
      }

      if (!allBrands || !Array.isArray(allBrands)) {
        return [];
      }


      // Convertir a formato esperado por el frontend (sin filtrar por año)
      const result = allBrands.map(brand => ({
        id: brand.id.toString(),
        name: brand.name
      }));

      return result;

    } catch (error) {
      console.error(`❌ Error obteniendo todas las marcas:`, error);
      throw error;
    }
  }

  // Obtener modelos por marca y año - Usar /brands/{brand_id}/models/ CON PAGINACIÓN
  async getModels(year, brandId) {
    try {
      
      let allModels = [];
      let currentPage = 1;
      let totalPages = 1;
      
      // Primera llamada para obtener información de paginación
      const firstResponse = await this.makeRequest(`/brands/${brandId}/models/`, {
        query_mode: 'matching',
        page: currentPage,
        page_size: 100
      }, true);
      
      if (!firstResponse.data || !Array.isArray(firstResponse.data)) {
        return [];
      }
      
      // Agregar modelos de la primera página
      allModels = allModels.concat(firstResponse.data);
      
      // Extraer información de paginación del header x-pagination
      
      if (firstResponse.headers && firstResponse.headers['x-pagination']) {
        try {
          const paginationInfo = JSON.parse(firstResponse.headers['x-pagination']);
          totalPages = paginationInfo.total_pages;
        } catch (parseError) {
        }
      } else {
      }
      
      // Si hay más páginas, procesarlas
      if (totalPages > 1) {
        
        for (let page = 2; page <= totalPages; page++) {
          try {
            
            const response = await this.makeRequest(`/brands/${brandId}/models/`, {
              query_mode: 'matching',
              page: page,
              page_size: 100
            });
            
            if (response && Array.isArray(response)) {
              allModels = allModels.concat(response);
            }
            
            // Delay entre páginas para respetar rate limiting
            if (page < totalPages) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
          } catch (pageError) {
            console.error(`❌ Error en página ${page}:`, pageError);
            // Continuar con la siguiente página
          }
        }
      }
      

      // FILTRADO PRINCIPAL: Solo modelos que realmente salieron en el año especificado
      const filteredModels = allModels.filter(model => {
        // Verificar si el modelo tiene información de años de producción
        if (model.years && Array.isArray(model.years)) {
          // Si tiene array de años, verificar que el año esté incluido
          return model.years.includes(parseInt(year));
        }
        
        // Verificar si tiene información de precios por año
        if (model.prices && model.prices_from && model.prices_to) {
          // Si tiene rango de precios por año, verificar que el año esté en el rango
          return year >= model.prices_from && year <= model.prices_to;
        }
        
        // Verificar si tiene descripción que mencione el año específico
        if (model.description && model.description.includes(year.toString())) {
          return true;
        }
        
        // Verificar si tiene información de producción por año
        if (model.production_years && Array.isArray(model.production_years)) {
          return model.production_years.includes(parseInt(year));
        }
        
        // Si no tiene información específica de años, NO incluirlo por defecto
        // Solo incluirlo si explícitamente se confirma que es del año
        return false;
      });


      // Si no hay modelos para ese año específico, mostrar mensaje informativo
      if (filteredModels.length === 0) {
        return [];
      }

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
      const result = Array.from(groupedModels.values()).map(model => ({
        id: model.id.toString(),
        name: model.name
      }));

      return result;

    } catch (error) {
      console.error(`❌ Error obteniendo modelos para marca ${brandId} año ${year}:`, error);
      throw error;
    }
  }

  // Obtener TODOS los modelos de una marcasdasda (sin filtrar por año) - CORREGIDO
  async getAllModelsForBrand(brandId) {
    try {
      
      let allModels = [];
      let currentPage = 1;
      let totalPages = 1;
      
      // Primera llamada para obtener información de paginación
      const firstResponse = await this.makeRequest(`/brands/${brandId}/models/`, {
        query_mode: 'matching',
        page: currentPage,
        page_size: 100
      }, true);
      
      if (!firstResponse.data || !Array.isArray(firstResponse.data)) {
        return [];
      }
      
      // Agregar modelos de la primera página
      allModels = allModels.concat(firstResponse.data);
      
      // Extraer información de paginación del header x-pagination
      if (firstResponse.headers && firstResponse.headers['x-pagination']) {
        try {
          const paginationInfo = JSON.parse(firstResponse.headers['x-pagination']);
          totalPages = paginationInfo.total_pages;
        } catch (parseError) {
          console.log('⚠️ Error parseando información de paginación, continuando...');
        }
      }
      
      // Si hay más páginas, procesarlas
      if (totalPages > 1) {
        
        for (let page = 2; page <= totalPages; page++) {
          try {
            
            const response = await this.makeRequest(`/brands/${brandId}/models/`, {
              query_mode: 'matching',
              page: page,
              page_size: 100
            });
            
            if (response && Array.isArray(response)) {
              allModels = allModels.concat(response);
            }
            
            // Delay entre páginas para respetar rate limiting
            if (page < totalPages) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
          } catch (pageError) {
            console.error(`❌ Error en página ${page}:`, pageError);
            // Continuar con la siguiente página
          }
        }
      }
      

      // Agrupar modelos por grupo base para evitar duplicados (sin filtrar por año)
      const groupedModels = new Map();
      
      allModels.forEach(model => {
        const groupKey = model.group?.name || 'Sin grupo';
        const groupId = model.group?.id || '0';
        
        if (!groupedModels.has(groupKey)) {
          // Crear el modelo base con información del primer modelo del grupo
          groupedModels.set(groupKey, {
            id: groupId,
            name: groupKey,
            fullDescription: model.description || 'Modelo sin nombre',
            // ✅ AGREGAR TODA LA INFORMACIÓN DE PRECIOS
            prices: model.prices,
            prices_from: model.prices_from,
            prices_to: model.prices_to,
            // ✅ AGREGAR OTROS CAMPOS ÚTILES
            description: model.description,
            photo_url: model.photo_url,
            list_price: model.list_price,
            as_codia: model.as_codia,
            codia: model.codia,
            features: model.features,
            brand: model.brand,
            group: model.group,
            position: model.position,
            r_codia: model.r_codia,
            summary: model.summary,
            similarity: model.similarity,
            // ✅ AGREGAR ARRAYS PARA ACUMULAR INFORMACIÓN DE TODOS LOS MODELOS DEL GRUPO
            all_prices_from: [model.prices_from],
            all_prices_to: [model.prices_to],
            all_descriptions: [model.description]
          });
        } else {
          // Acumular información de años de otros modelos del mismo grupo
          const existingModel = groupedModels.get(groupKey);
          if (model.prices_from) existingModel.all_prices_from.push(model.prices_from);
          if (model.prices_to) existingModel.all_prices_to.push(model.prices_to);
          if (model.description) existingModel.all_descriptions.push(model.description);
          
          // Actualizar el rango de precios para incluir todos los años del grupo
          if (model.prices_from && (!existingModel.prices_from || model.prices_from < existingModel.prices_from)) {
            existingModel.prices_from = model.prices_from;
          }
          if (model.prices_to && (!existingModel.prices_to || model.prices_to > existingModel.prices_to)) {
            existingModel.prices_to = model.prices_to;
          }
        }
      });

      // ✅ DEVOLVER MODELOS COMPLETOS CON TODA LA INFORMACIÓN
      const result = Array.from(groupedModels.values());

      return result;

    } catch (error) {
      console.error(`❌ Error obteniendo todos los modelos para marca ${brandId}:`, error);
      throw error;
    }
  }

  // Obtener TODAS las versiones de un modelo (sin filtrar por año) - CORREGIDO
  async getVersions(brandId, modelId) {
    try {
      
      let allVersions = [];
      let currentPage = 1;
      let totalPages = 1;
      
      // Primera llamada para obtener información de paginación
      const firstResponse = await this.makeRequest(`/brands/${brandId}/groups/${modelId}/models/`, {
        query_mode: 'matching',
        page: currentPage,
        page_size: 100
      }, true);
      
      if (!firstResponse.data || !Array.isArray(firstResponse.data)) {
        return [];
      }
      
      // Agregar versiones de la primera página
      allVersions = allVersions.concat(firstResponse.data);
      
      // Extraer información de paginación del header x-pagination
      
      if (firstResponse.headers && firstResponse.headers['x-pagination']) {
        try {
          const paginationInfo = JSON.parse(firstResponse.headers['x-pagination']);
          totalPages = paginationInfo.total_pages;
        } catch (parseError) {
        }
      } else {
      }
      
      // Si hay más páginas, procesarlas
      if (totalPages > 1) {
        
        for (let page = 2; page <= totalPages; page++) {
          try {
            
            const response = await this.makeRequest(`/brands/${brandId}/groups/${modelId}/models/`, {
              query_mode: 'matching',
              page: page,
              page_size: 100
            });
            
            if (response && Array.isArray(response)) {
              allVersions = allVersions.concat(response);
            }
            
            // Delay entre páginas para respetar rate limiting
            if (page < totalPages) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
          } catch (pageError) {
            console.error(`❌ Error en página ${page} de versiones:`, pageError);
            // Continuar con la siguiente página
          }
        }
      }
      

      // ✅ DEVOLVER VERSIONES COMPLETAS CON TODA LA INFORMACIÓN
      const formattedVersions = allVersions.map(version => {
        let versionName = version.description || 'Versión sin nombre';
        
        // Remover el nombre del modelo del inicio de la descripción si está presente
        // Por ejemplo: "A3 1.4T FSI L/10" -> "1.4T FSI L/10"
        const groupName = version.group?.name || '';
        if (groupName && versionName.startsWith(groupName)) {
          versionName = versionName.substring(groupName.length).trim();
          // Si queda vacío o solo espacios, usar la descripción completa
          if (!versionName) {
            versionName = version.description || 'Versión sin nombre';
          }
        }

        return {
          id: version.codia.toString(),
          name: versionName,
          // ✅ AGREGAR TODA LA INFORMACIÓN DE PRECIOS
          prices: version.prices,
          prices_from: version.prices_from,
          prices_to: version.prices_to,
          // ✅ AGREGAR OTROS CAMPOS ÚTILES
          description: version.description,
          photo_url: version.photo_url,
          list_price: version.list_price,
          as_codia: version.as_codia,
          codia: version.codia,
          features: version.features,
          brand: version.brand,
          group: version.group,
          position: version.position,
          r_codia: version.r_codia,
          summary: version.summary,
          similarity: version.similarity
        };
      });

      
      if (formattedVersions.length === 0) {
        console.log(`⚠️ No se encontraron versiones para grupo ${modelId}, usando fallback`);
        // Fallback: crear versiones básicas
        return [
          { id: "1", name: "Versión Estándar" },
          { id: "2", name: "Versión Premium" },
          { id: "3", name: "Versión Sport" }
        ];
      }
      
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
