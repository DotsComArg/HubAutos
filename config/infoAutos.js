// Configuración de Info Autos API
module.exports = {
  // Tokens de autenticación - ACTUALIZADOS
  ACCESS_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1NjMwMzI0NCwianRpIjoiZDM1MWFjNjItMmY3OS00YjkzLTg2NTMtNjZiMTEwMzhjNjNmIiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5Ijo1MzcsIm5iZiI6MTc1NjMwMzI0NCwiY3NyZiI6IjgxNTBlNDdmLWUzMmYtNDdmNS04MmE2LTZjZTA5ZjNhNTVhNSIsImV4cCI6MTc1NjMwNjg0NCwicm9sZXMiOlt7ImlkIjoxOSwibmFtZSI6IkRlc2Fycm9sbG8ifSx7ImlkIjoxMCwibmFtZSI6IkV4dHJhcyJ9LHsiaWQiOjksIm5hbWUiOiJNb2RlbG9zIn1dfQ.gGrAVCDepULhDiKvMW20xoPuUSEZs9OUqKRLp2N55SY",
  REFRESH_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1NjMwMzI0NCwianRpIjoiYmVhMzU4N2UtMWJiMi00NDM1LWIwNWYtMjg4N2MzOGNmNDhmIiwidHlwZSI6InJlZnJlc2giLCJpZGVudGl0eSI6NTM3LCJuYmYiOjE3NTYzMDMyNDQsImNzcmYiOiI0MGE1MGQ2OC1jOGE0LTQ1NWUtYmM4NS0yMjJkN2IwMzI5OWUiLCJleHAiOjE3NTYzODk2NDQsInJvbGVzIjpbeyJpZCI6MTksIm5hbWUiOiJEZXNhcnJvbG8ifSx7ImlkIjoxMCwibmFtZSI6IkV4dHJhcyJ9LHsiaWQiOjksIm5hbWUiOiJNb2RlbG9zIn1dfQ.75Wk0OZ8znXOOAUi7y0-v4LkEG3x1ssMPXCnHzSeUjg",
  
  // URL base de la API
  BASE_URL: "https://api.infoauto.com.ar/cars/pub",
  
  // Configuración de cache
  CACHE_DURATION: 30 * 60 * 1000, // 30 minutos
  
  // Configuración de reintentos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 segundo
};
