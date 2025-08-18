const InfoAutosService = require('../../classes/infoAutosService');
require('dotenv').config();

const infoAutosService = new InfoAutosService();

// Inicializar el servicio con las credenciales
infoAutosService.initialize(
    process.env.INFOAUTOS_ACCESS_TOKEN,
    process.env.INFOAUTOS_REFRESH_TOKEN
);

module.exports = async (req, res) => {
    // Headers CORS específicos para Vercel
    res.setHeader('Access-Control-Allow-Origin', 'https://hubautos.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Solo permitir GET
    if (req.method !== 'GET') {
        res.status(405).json({ 
            success: false, 
            error: 'Método no permitido' 
        });
        return;
    }

    try {
        const years = await infoAutosService.getYears();
        res.status(200).json({
            success: true,
            data: years
        });
    } catch (error) {
        console.error('Error obteniendo años:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
};
