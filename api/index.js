const express = require('express');
const cors = require('cors');
const autoQuoteRoutes = require('./autoQuoteRoutes');
const infoAutosRoutes = require('./infoAutosRoutes');
require('dotenv').config();

const app = express();

// Configuración de CORS para permitir requests desde hubautos.com
app.use(cors({
  origin: ['https://hubautos.com', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Middleware para manejar preflight OPTIONS
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin === 'https://hubautos.com' || origin === 'http://localhost:3000' || origin === 'http://localhost:3001') {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Middleware para agregar headers CORS a todas las respuestas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === 'https://hubautos.com' || origin === 'http://localhost:3000' || origin === 'http://localhost:3001') {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  next();
});

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
