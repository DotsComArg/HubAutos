#!/bin/bash

echo "🚀 Instalando dependencias para HubAutos..."

# Limpiar node_modules y package-lock.json
echo "🧹 Limpiando instalación anterior..."
rm -rf node_modules package-lock.json

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar instalación de Chromium
echo "🔍 Verificando instalación de Chromium..."
node -e "
const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

async function testChromium() {
  try {
    const executablePath = await chromium.executablePath();
    console.log('✅ Chromium instalado correctamente en:', executablePath);
    
    // Test básico de Puppeteer
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    console.log('✅ Puppeteer funciona correctamente');
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error con Chromium:', error.message);
    process.exit(1);
  }
}

testChromium();
"

echo "✅ Instalación completada!"
echo ""
echo "📋 Para ejecutar el servidor:"
echo "   npm start"
echo ""
echo "🔧 Para desarrollo:"
echo "   npm run dev"
