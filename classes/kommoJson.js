const { formatKilometers } = require('../utils/formatNumbers');

class LeadJsonCreator {
  constructor() {}

  createCustomFields(data) {
    // Formatear kilometraje con puntos como separador de miles
    const kilometrajeFormateado = formatKilometers(data.kilometraje || data.km);
    
    return [
      { field_id: 1808372, values: [{ value: data.ano?.toString() || "" }] },
      { field_id: 1795890, values: [{ value: data.marca || "" }] },
      { field_id: 1795892, values: [{ value: data.modelo || "" }] },
      { field_id: 1807454, values: [{ value: data.version || "" }] },
      { field_id: 1807442, values: [{ value: kilometrajeFormateado }] },
      { field_id: 1796372, values: [{ value: data.cp?.toString() || data.codigo_postal?.toString() || "" }] }
    ];
  }

  filterCustomFields(fields) {
    return fields.filter((field) =>
      field.values.some((value) => value.value !== null && value.value !== "")
    );
  }

  leadJson(data) {
    const customFields = this.createCustomFields(data);
    const filteredCustomFields = this.filterCustomFields(customFields);
    
    // Detectar número de prueba para usar pipeline diferente
    const isTestNumber = data.phone === '3794556599';
    const pipelineId = isTestNumber ? 11774380 : 7902116;
    
    return [
      {
        pipeline_id: pipelineId,
        status_id: 85037464,
        custom_fields_values: filteredCustomFields,
        created_at: Math.floor(Date.now() / 1000),
      },
    ];
  }

  complexJson(data) {
    const customFields = this.createCustomFields(data);
    const filteredCustomFields = this.filterCustomFields(customFields);

    const contactFields = [
      { field_id: 1757094, values: [{ value: "+" + (data.telefono || "") }] },
      { field_id: 1757096, values: [{ value: data.email || "" }] },
      { field_id: 1807638, values: [{ value: Number(data.dni) || "" }] },
    ];
    const filteredContactFields = this.filterCustomFields(contactFields);
    
    // Detectar número de prueba para usar pipeline diferente
    const isTestNumber = data.phone === '3794556599';
    const pipelineId = isTestNumber ? 11774380 : 7902116;
    
    return [
      {
        pipeline_id: pipelineId,
        status_id: 83702104,
        custom_fields_values: filteredCustomFields,
        _embedded: {
          contacts: [
            {
              name: data.nombre_completo || "Sin nombre",
              custom_fields_values: filteredContactFields,
            },
          ],
        },
        created_at: Math.floor(Date.now() / 1000),
      },
    ];
  }
}

module.exports = { LeadJsonCreator };