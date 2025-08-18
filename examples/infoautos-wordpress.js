/**
 * Info Autos WordPress Integration
 * Script para integrar la API de Info Autos en formularios de WordPress
 * 
 * @version 1.0.0
 * @author HubAutos
 */

(function(window, document) {
    'use strict';

    // Configuración global
    const InfoAutosConfig = {
        apiUrl: 'https://tu-dominio.com/api/infoautos',
        cacheDuration: 30 * 60 * 1000, // 30 minutos
        debug: false
    };

    // Cache local
    const cache = new Map();

    // Clase principal
    class InfoAutosForm {
        constructor(options = {}) {
            this.options = { ...InfoAutosConfig, ...options };
            this.elements = {};
            this.isInitialized = false;
            
            this.init();
        }

        init() {
            try {
                this.setupElements();
                this.bindEvents();
                this.loadYears();
                this.isInitialized = true;
                
                if (this.options.debug) {
                    console.log('Info Autos Form inicializado correctamente');
                }
            } catch (error) {
                console.error('Error inicializando Info Autos Form:', error);
            }
        }

        setupElements() {
            // Obtener elementos del DOM
            this.elements.year = document.querySelector(this.options.yearSelect);
            this.elements.brand = document.querySelector(this.options.brandSelect);
            this.elements.model = document.querySelector(this.options.modelSelect);
            this.elements.version = document.querySelector(this.options.versionSelect);

            // Validar que existan todos los elementos
            if (!this.elements.year || !this.elements.brand || !this.elements.model || !this.elements.version) {
                throw new Error('No se encontraron todos los elementos requeridos del formulario');
            }

            // Configurar estados iniciales
            this.elements.brand.disabled = true;
            this.elements.model.disabled = true;
            this.elements.version.disabled = true;
        }

        bindEvents() {
            // Event listeners para cambios en los selects
            this.elements.year.addEventListener('change', (e) => this.onYearChange(e));
            this.elements.brand.addEventListener('change', (e) => this.onBrandChange(e));
            this.elements.model.addEventListener('change', (e) => this.onModelChange(e));
            this.elements.version.addEventListener('change', (e) => this.onVersionChange(e));

            // Event listener para el formulario
            const form = this.elements.year.closest('form');
            if (form) {
                form.addEventListener('submit', (e) => this.onFormSubmit(e));
            }
        }

        async loadYears() {
            try {
                this.showLoading(this.elements.year, 'Cargando años...');
                
                const years = await this.apiCall('/years');
                this.populateSelect(this.elements.year, years, 'Selecciona un año');
                
                if (this.options.debug) {
                    console.log('Años cargados:', years.length);
                }
            } catch (error) {
                this.showError(this.elements.year, 'Error cargando años');
                console.error('Error cargando años:', error);
            }
        }

        async onYearChange(event) {
            const year = event.target.value;
            if (!year) return;

            try {
                // Resetear selects dependientes
                this.resetSelect(this.elements.brand, 'Selecciona una marca');
                this.resetSelect(this.elements.model, 'Primero selecciona una marca');
                this.resetSelect(this.elements.version, 'Primero selecciona un modelo');

                // Habilitar select de marcas
                this.elements.brand.disabled = false;

                // Cargar marcas
                this.showLoading(this.elements.brand, 'Cargando marcas...');
                const brands = await this.apiCall(`/brands/${year}`);
                this.populateSelect(this.elements.brand, brands, 'Selecciona una marca');

                if (this.options.debug) {
                    console.log(`Marcas cargadas para año ${year}:`, brands.length);
                }
            } catch (error) {
                this.showError(this.elements.brand, 'Error cargando marcas');
                console.error('Error cargando marcas:', error);
            }
        }

        async onBrandChange(event) {
            const brandId = event.target.value;
            if (!brandId) return;

            const year = this.elements.year.value;
            if (!year) return;

            try {
                // Resetear selects dependientes
                this.resetSelect(this.elements.model, 'Selecciona un modelo');
                this.resetSelect(this.elements.version, 'Primero selecciona un modelo');

                // Habilitar select de modelos
                this.elements.model.disabled = false;

                // Cargar modelos
                this.showLoading(this.elements.model, 'Cargando modelos...');
                const models = await this.apiCall(`/models/${year}/${brandId}`);
                this.populateSelect(this.elements.model, models, 'Selecciona un modelo');

                if (this.options.debug) {
                    console.log(`Modelos cargados para marca ${brandId}:`, models.length);
                }
            } catch (error) {
                this.showError(this.elements.model, 'Error cargando modelos');
                console.error('Error cargando modelos:', error);
            }
        }

        async onModelChange(event) {
            const modelId = event.target.value;
            if (!modelId) return;

            const year = this.elements.year.value;
            const brandId = this.elements.brand.value;
            if (!year || !brandId) return;

            try {
                // Resetear select de versiones
                this.resetSelect(this.elements.version, 'Selecciona una versión');

                // Habilitar select de versiones
                this.elements.version.disabled = false;

                // Cargar versiones
                this.showLoading(this.elements.version, 'Cargando versiones...');
                const versions = await this.apiCall(`/versions/${year}/${brandId}/${modelId}`);
                this.populateSelect(this.elements.version, versions, 'Selecciona una versión');

                if (this.options.debug) {
                    console.log(`Versiones cargadas para modelo ${modelId}:`, versions.length);
                }
            } catch (error) {
                this.showError(this.elements.version, 'Error cargando versiones');
                console.error('Error cargando versiones:', error);
            }
        }

        onVersionChange(event) {
            const versionId = event.target.value;
            if (versionId) {
                // Disparar evento personalizado
                const customEvent = new CustomEvent('infoautos:vehicleSelected', {
                    detail: {
                        year: this.elements.year.value,
                        brand: this.elements.brand.options[this.elements.brand.selectedIndex]?.textContent,
                        brandId: this.elements.brand.value,
                        model: this.elements.model.options[this.elements.model.selectedIndex]?.textContent,
                        modelId: this.elements.model.value,
                        version: this.elements.version.options[this.elements.version.selectedIndex]?.textContent,
                        versionId: versionId
                    }
                });
                document.dispatchEvent(customEvent);

                if (this.options.debug) {
                    console.log('Vehículo seleccionado:', customEvent.detail);
                }
            }
        }

        async onFormSubmit(event) {
            // Validar que todos los campos estén completos
            const year = this.elements.year.value;
            const brandId = this.elements.brand.value;
            const modelId = this.elements.model.value;
            const versionId = this.elements.version.value;

            if (!year || !brandId || !modelId || !versionId) {
                event.preventDefault();
                alert('Por favor, completa todos los campos del vehículo antes de enviar el formulario.');
                return;
            }

            // Disparar evento de validación exitosa
            const validationEvent = new CustomEvent('infoautos:formValidated', {
                detail: {
                    year, brandId, modelId, versionId,
                    brand: this.elements.brand.options[this.elements.brand.selectedIndex]?.textContent,
                    model: this.elements.model.options[this.elements.model.selectedIndex]?.textContent,
                    version: this.elements.version.options[this.elements.version.selectedIndex]?.textContent
                }
            });
            document.dispatchEvent(validationEvent);
        }

        // Métodos de utilidad
        async apiCall(endpoint) {
            const cacheKey = `${this.options.apiUrl}${endpoint}`;
            
            // Verificar cache
            if (cache.has(cacheKey)) {
                const cached = cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.options.cacheDuration) {
                    if (this.options.debug) {
                        console.log('Cache hit para:', endpoint);
                    }
                    return cached.data;
                }
            }

            try {
                const response = await fetch(`${this.options.apiUrl}${endpoint}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `HTTP ${response.status}`);
                }

                if (!data.success) {
                    throw new Error(data.error || 'Error en la respuesta de la API');
                }

                // Guardar en cache
                cache.set(cacheKey, {
                    data: data.data,
                    timestamp: Date.now()
                });

                return data.data;
            } catch (error) {
                throw new Error(`Error en API call a ${endpoint}: ${error.message}`);
            }
        }

        populateSelect(select, data, placeholder) {
            select.innerHTML = '';
            
            // Agregar placeholder
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholder;
            select.appendChild(placeholderOption);

            // Agregar opciones
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                select.appendChild(option);
            });
        }

        resetSelect(select, placeholder) {
            select.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = placeholder;
            select.appendChild(option);
            select.disabled = true;
        }

        showLoading(select, message) {
            select.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = message;
            option.disabled = true;
            select.appendChild(option);
        }

        showError(select, message) {
            select.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = message;
            option.disabled = true;
            select.appendChild(option);
        }

        // Métodos públicos
        getSelectedVehicle() {
            return {
                year: this.elements.year.value,
                brandId: this.elements.brand.value,
                modelId: this.elements.model.value,
                versionId: this.elements.version.value,
                brand: this.elements.brand.options[this.elements.brand.selectedIndex]?.textContent,
                model: this.elements.model.options[this.elements.model.selectedIndex]?.textContent,
                version: this.elements.version.options[this.elements.version.selectedIndex]?.textContent
            };
        }

        clearCache() {
            cache.clear();
            if (this.options.debug) {
                console.log('Cache limpiado');
            }
        }

        destroy() {
            // Remover event listeners
            this.elements.year.removeEventListener('change', this.onYearChange);
            this.elements.brand.removeEventListener('change', this.onBrandChange);
            this.elements.model.removeEventListener('change', this.onModelChange);
            this.elements.version.removeEventListener('change', this.onVersionChange);

            // Limpiar cache
            this.clearCache();
            
            this.isInitialized = false;
            
            if (this.options.debug) {
                console.log('Info Autos Form destruido');
            }
        }
    }

    // API pública
    window.InfoAutosForm = InfoAutosForm;

    // Función de inicialización global
    window.initInfoAutosForm = function(options) {
        return new InfoAutosForm(options);
    };

    // Auto-inicialización si hay elementos con data-infoautos
    document.addEventListener('DOMContentLoaded', function() {
        const autoInitElements = document.querySelectorAll('[data-infoautos]');
        if (autoInitElements.length > 0) {
            autoInitElements.forEach(element => {
                const config = element.dataset.infoautos ? JSON.parse(element.dataset.infoautos) : {};
                new InfoAutosForm(config);
            });
        }
    });

})(window, document);
