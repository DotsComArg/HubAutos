// Configuración específica para Chromium en Vercel
const chromium = require('@sparticuz/chromium-min');

// Configuración optimizada para Vercel
const chromiumConfig = {
  args: [
    ...chromium.args,
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ],
  defaultViewport: chromium.defaultViewport,
  executablePath: chromium.executablePath,
  headless: chromium.headless,
  ignoreHTTPSErrors: true,
  timeout: 30000
};

// Función para obtener la configuración
function getChromiumConfig() {
  return chromiumConfig;
}

// Función para verificar si Chromium está disponible
async function isChromiumAvailable() {
  try {
    const executablePath = await chromium.executablePath();
    return !!executablePath;
  } catch (error) {
    console.error('Chromium no está disponible:', error.message);
    return false;
  }
}

module.exports = {
  getChromiumConfig,
  isChromiumAvailable,
  chromiumConfig
};
