// Configuración de Info Autos API
module.exports = {
  // Tokens de autenticación
  ACCESS_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1NjIwODI2OCwianRpIjoiZTNlMThmZmYtNWJiOS00NTMxLTg1NTUtNjJjOTllNzk0NTYxIiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5Ijo1MzcsIm5iZiI6MTc1NjIwODI2OCwiY3NyZiI6IjYwM2ZmYmRhLTcwN2QtNDFlYS04MWVkLWJkNDA2MzVhYzA2YyIsImV4cCI6MTc1NjIxMTg2OCwicm9sZXMiOlt7ImlkIjoxOSwibmFtZSI6IkRlc2Fycm9sbG8ifSx7ImlkIjoxMCwibmFtZSI6IkV4dHJhcyJ9LHsiaWQiOjksIm5hbWUiOiJNb2RlbG9zIn1dfQ.8aiEYcre36pwUe60ofc8CcHvkbVKjGnlNbapebI-fsU",
  REFRESH_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1NjIwODI2OCwianRpIjoiNDliYTI5YTYtZmEyZC00ZjA5LTlhOWItYTlmNDUwNDg4NTdhIiwidHlwZSI6InJlZnJlc2giLCJpZGVudGl0eSI6NTM3LCJuYmYiOjE3NTYyMDgyNjgsImNzcmYiOiIxM2UwNmM5NS0wNDJkLTQyN2YtOTY2ZC1iYzc5YTRmOTkwN2UiLCJleHAiOjE3NTYyOTQ2NjgsInJvbGVzIjpbeyJpZCI6MTksIm5hbWUiOiJEZXNhcnJvbGxvIn0seyJpZCI6MTAsIm5hbWUiOiJFeHRyYXMifSx7ImlkIjo5LCJuYW1lIjoiTW9kZWxvcyJ9XX0.WL6_AlHI8mxlZyoSGxsQ_n4kICWKMvEFtu4X10TJ6vc",
  
  // URL base de la API
  BASE_URL: "https://api.infoauto.com.ar/cars/pub",
  
  // Configuración de cache
  CACHE_DURATION: 30 * 60 * 1000, // 30 minutos
  
  // Configuración de reintentos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 segundo
};
