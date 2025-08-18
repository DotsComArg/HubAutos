const express = require('express');
const cors = require('cors');
const autoQuoteRoutes = require('./autoQuoteRoutes');
const infoAutosRoutes = require('./infoAutosRoutes');
require('dotenv').config();

const app = express();

// Configuración de CORS para permitir requests desde cualquier origen
app.use(cors({
  origin: ['https://hubautos.com', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Middleware para manejar preflight OPTIONS
app.options('*', cors());

// Middleware para parsear JSON
app.use(express.json());

// Middleware para parsear datos de formulario
app.use(express.urlencoded({ extended: true }));

// Ruta de health check
app.get('/', (req, res) => {
  res.json({ message: 'HubAutos Server está funcionando correctamente' });
});

// Rutas de la API
app.use('/api/auto-quote', autoQuoteRoutes);
app.use('/api/infoautos', infoAutosRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error en el servidor:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Ruta no encontrada' 
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚗 HubAutos Server corriendo en puerto ${PORT}`);
  console.log(`🌐 Servidor disponible en: http://localhost:${PORT}`);
});

module.exports = app;
