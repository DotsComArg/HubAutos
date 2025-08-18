const cron = require('node-cron');
const InfoAutosETL = require('./infoAutosETL');
const mongoose = require('mongoose');
require('dotenv').config();

class AutoSyncService {
    constructor() {
        this.etl = null;
        this.isRunning = false;
        this.lastSync = null;
        this.syncStats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            lastError: null
        };
    }

    // Inicializar el servicio
    async initialize() {
        try {
            console.log('🚀 Inicializando servicio de sincronización automática...');
            
            // Conectar a MongoDB si no está conectado
            if (mongoose.connection.readyState !== 1) {
                await mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
                console.log('✅ Conectado a MongoDB para sincronización automática');
            }

            // Crear instancia del ETL
            this.etl = new InfoAutosETL();
            
            // Programar sincronización diaria a las 10:00 AM hora Argentina (UTC-3)
            // Como Vercel usa UTC, programamos a las 13:00 UTC (10:00 AM Argentina)
            cron.schedule('0 13 * * *', async () => {
                console.log('⏰ Ejecutando sincronización automática programada...');
                await this.runAutoSync();
            }, {
                timezone: 'UTC'
            });

            console.log('✅ Sincronización automática programada para las 10:00 AM (hora Argentina)');
            
            // Ejecutar sincronización inicial si es la primera vez
            await this.runInitialSync();
            
        } catch (error) {
            console.error('❌ Error inicializando servicio de sincronización:', error);
            throw error;
        }
    }

    // Sincronización inicial (solo si no hay datos)
    async runInitialSync() {
        try {
            const InfoAuto = require('../models/InfoAuto');
            const count = await InfoAuto.countDocuments();
            
            if (count === 0) {
                console.log('🔄 No hay datos en la base. Ejecutando sincronización inicial...');
                await this.runAutoSync();
            } else {
                console.log(`📊 Base de datos ya tiene ${count} vehículos. Omitiendo sincronización inicial.`);
            }
        } catch (error) {
            console.error('❌ Error en sincronización inicial:', error);
        }
    }

    // Ejecutar sincronización automática
    async runAutoSync() {
        if (this.isRunning) {
            console.log('⏳ Sincronización ya en progreso, omitiendo...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            console.log('🔄 Iniciando sincronización automática...');
            
            // Ejecutar sincronización incremental (solo datos nuevos/actualizados)
            const result = await this.etl.syncAllData();
            
            this.lastSync = new Date();
            this.syncStats.totalRuns++;
            this.syncStats.successfulRuns++;
            
            const duration = Math.round((Date.now() - startTime) / 1000);
            console.log(`✅ Sincronización automática completada en ${duration}s. Vehículos: ${result.totalVehicles}`);
            
        } catch (error) {
            console.error('❌ Error en sincronización automática:', error);
            this.syncStats.totalRuns++;
            this.syncStats.failedRuns++;
            this.syncStats.lastError = {
                message: error.message,
                timestamp: new Date()
            };
        } finally {
            this.isRunning = false;
        }
    }

    // Obtener estado del servicio
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastSync: this.lastSync,
            nextSync: this.getNextSyncTime(),
            stats: this.syncStats,
            isInitialized: !!this.etl
        };
    }

    // Calcular próxima sincronización
    getNextSyncTime() {
        const now = new Date();
        const nextSync = new Date();
        
        // Próxima sincronización a las 10:00 AM hora Argentina (13:00 UTC)
        nextSync.setUTCHours(13, 0, 0, 0);
        
        // Si ya pasó hoy, programar para mañana
        if (nextSync <= now) {
            nextSync.setUTCDate(nextSync.getUTCDate() + 1);
        }
        
        return nextSync;
    }

    // Ejecutar sincronización manual
    async runManualSync(year = null) {
        if (this.isRunning) {
            throw new Error('Sincronización ya en progreso');
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            let result;
            if (year) {
                result = await this.etl.syncYear(parseInt(year));
            } else {
                result = await this.etl.syncAllData();
            }
            
            this.lastSync = new Date();
            this.syncStats.totalRuns++;
            this.syncStats.successfulRuns++;
            
            const duration = Math.round((Date.now() - startTime) / 1000);
            return {
                success: true,
                duration,
                result
            };
            
        } catch (error) {
            this.syncStats.totalRuns++;
            this.syncStats.failedRuns++;
            this.syncStats.lastError = {
                message: error.message,
                timestamp: new Date()
            };
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    // Detener el servicio
    stop() {
        console.log('🛑 Deteniendo servicio de sincronización automática...');
        // El cron se detiene automáticamente cuando se cierra la aplicación
    }
}

module.exports = AutoSyncService;
