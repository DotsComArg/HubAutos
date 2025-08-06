/**
 * Formatea números agregando puntos como separadores de miles y símbolo de peso
 */

function formatPrice(value) {
  if (!value || value === '' || value === '0') return '';
  
  // Convertir a string y eliminar caracteres no numéricos
  const cleanValue = value.toString().replace(/[^\d]/g, '');
  
  if (!cleanValue || cleanValue === '0') return '';
  
  // Formatear con puntos como separadores de miles
  const formatted = parseInt(cleanValue).toLocaleString('es-AR');
  
  // Agregar símbolo de peso
  return `$${formatted}`;
}

function formatNumber(value) {
  if (!value || value === '' || value === '0') return '';
  
  // Convertir a string y eliminar caracteres no numéricos
  const cleanValue = value.toString().replace(/[^\d]/g, '');
  
  if (!cleanValue || cleanValue === '0') return '';
  
  // Formatear con puntos como separadores de miles
  return parseInt(cleanValue).toLocaleString('es-AR');
}

function formatKilometers(value) {
  if (!value || value === '' || value === '0') return '';
  
  // Convertir a string y eliminar caracteres no numéricos
  const cleanValue = value.toString().replace(/[^\d]/g, '');
  
  if (!cleanValue || cleanValue === '0') return '';
  
  // Formatear con puntos como separadores de miles y agregar "km"
  const formatted = parseInt(cleanValue).toLocaleString('es-AR');
  return `${formatted} km`;
}

module.exports = {
  formatPrice,
  formatNumber,
  formatKilometers
};