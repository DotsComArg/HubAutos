const InfoAutosService = require('./classes/infoAutosService');
require('dotenv').config();

async function testInfoAutos() {
    console.log('🚗 Iniciando pruebas de Info Autos API...\n');

    const infoAutosService = new InfoAutosService();
    
    // Inicializar con las credenciales
    infoAutosService.initialize(
        process.env.INFOAUTOS_ACCESS_TOKEN,
        process.env.INFOAUTOS_REFRESH_TOKEN
    );

    try {
        // Test 1: Obtener años
        console.log('📅 Test 1: Obteniendo años disponibles...');
        const years = await infoAutosService.getYears();
        console.log('✅ Años obtenidos:', years.length, 'años');
        console.log('📋 Primeros 5 años:', years.slice(0, 5));
        console.log('');

        if (years.length > 0) {
            const testYear = years[0].year || years[0];
            console.log(`🏷️  Usando año de prueba: ${testYear}`);

            // Test 2: Obtener marcas para el año
            console.log('🏭 Test 2: Obteniendo marcas para el año...');
            const brands = await infoAutosService.getBrands(testYear);
            console.log('✅ Marcas obtenidas:', brands.length, 'marcas');
            console.log('📋 Primeras 5 marcas:', brands.slice(0, 5).map(b => ({ id: b.id, name: b.name })));
            console.log('');

            if (brands.length > 0) {
                const testBrand = brands[0];
                console.log(`🚗 Usando marca de prueba: ${testBrand.name} (ID: ${testBrand.id})`);

                // Test 3: Obtener modelos para la marca
                console.log('🚙 Test 3: Obteniendo modelos para la marca...');
                const models = await infoAutosService.getModels(testYear, testBrand.id);
                console.log('✅ Modelos obtenidos:', models.length, 'modelos');
                console.log('📋 Primeros 5 modelos:', models.slice(0, 5).map(m => ({ id: m.id, name: m.name })));
                console.log('');

                if (models.length > 0) {
                    const testModel = models[0];
                    console.log(`🔧 Usando modelo de prueba: ${testModel.name} (ID: ${testModel.id})`);

                    // Test 4: Obtener versiones para el modelo
                    console.log('⚙️  Test 4: Obteniendo versiones para el modelo...');
                    const versions = await infoAutosService.getVersions(testYear, testBrand.id, testModel.id);
                    console.log('✅ Versiones obtenidas:', versions.length, 'versiones');
                    console.log('📋 Primeras 5 versiones:', versions.slice(0, 5).map(v => ({ id: v.id, name: v.name })));
                    console.log('');

                    // Test 5: Obtener datos completos del vehículo
                    console.log('📊 Test 5: Obteniendo datos completos del vehículo...');
                    const vehicleData = await infoAutosService.getVehicleData(testYear, testBrand.id, testModel.id);
                    console.log('✅ Datos del vehículo obtenidos correctamente');
                    console.log('📋 Resumen:', {
                        year: vehicleData.year,
                        brandsCount: vehicleData.brands.length,
                        modelsCount: vehicleData.models.length,
                        versionsCount: vehicleData.versions.length
                    });
                    console.log('');
                }
            }
        }

        // Test 6: Búsqueda de vehículos
        console.log('🔍 Test 6: Búsqueda de vehículos...');
        const searchResults = await infoAutosService.searchVehicle('Gol', 2020);
        console.log('✅ Búsqueda completada:', searchResults.length, 'resultados');
        console.log('📋 Primeros 3 resultados:', searchResults.slice(0, 3));
        console.log('');

        // Test 7: Validación de datos
        console.log('✅ Test 7: Validación de datos...');
        const validation = infoAutosService.validateVehicleData(2020, '123', '456', '789');
        console.log('✅ Validación completada:', validation);
        console.log('');

        console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
        console.log('🚀 La API de Info Autos está funcionando correctamente.');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);
        console.error('📋 Detalles del error:', error);
    }
}

// Ejecutar las pruebas
testInfoAutos();
