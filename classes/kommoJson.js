const { formatKilometers } = require('../utils/formatNumbers');

class LeadJsonCreator {
  constructor() {
    // Usar la variable de entorno del pipeline de testing
    this.pipelineId = process.env.PIPELINE_ID || 11774380;
  }

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
    
    return [
      {
        pipeline_id: this.pipelineId,
        status_id: 90598860, // ENTRY NO INICIÓ - Pipeline de testing
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
    
    return [
      {
        pipeline_id: this.pipelineId,
        status_id: 90598860, // ENTRY NO INICIÓ - Pipeline de testing
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