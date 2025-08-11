const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

class KommoApiClient {
  constructor(subdomain, token) {
    this.variables = {
      access_token: token,
      subdomain: subdomain,
    };
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.variables.access_token}`,
      "Content-Type": "application/json",
    };
  }

  async postRequest(url, data) {
    try {
      const response = await axios.post(url, data, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(JSON.stringify(error.response.data));
      throw error;
    }
  }

  async patchRequest(url, data) {
    try {
      const response = await axios.patch(url, data, {
        headers: this.getHeaders(),
      });
      console.log(JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error(JSON.stringify(error.response.data));
      throw error.response.data;
    }
  }

  async getRequest(url) {
    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data || response;
    } catch (error) {
      console.error(JSON.stringify(error.response.data));
      throw error;
    }
  }

  async createLeadComplex(data) {
    const url = `https://${this.variables.subdomain}/api/v4/leads/complex`;
    return await this.postRequest(url, data);
  }

  async createLeadSimple(data) {
    const url = `https://${this.variables.subdomain}/api/v4/leads`;
    const response = await this.postRequest(url, data);
    return response._embedded.leads[0].id;
  }

  async updateLead(idLead, data) {
    const url = `https://${this.variables.subdomain}/api/v4/leads/${idLead}`;
    return await this.patchRequest(url, data);
  }

  async linkLead(leadId, contactId) {
    const url = `https://${this.variables.subdomain}/api/v4/contacts/${contactId}/link`;
    const data = [
      {
        to_entity_id: leadId,
        to_entity_type: "leads",
      },
    ];
    return await this.postRequest(url, data);
  }

  async getContactByPhone(phone) {
    const url = `https://${this.variables.subdomain}/api/v4/contacts?with=leads&query=${phone}`;
    const response = await this.getRequest(url);
    if (
      response.status === 204 ||
      response._embedded.contacts.length === 0
    ) {
      return false;
    }
    return {
      isContact: true,
      idContact: response._embedded.contacts[0].id,
      leads: response._embedded.contacts[0]._embedded.leads.map(
        (lead) => lead.id
      ),
    };
  }

  async getLeadsByPhone(phone) {
    try {
      // Buscar leads directamente por teléfono
      const url = `https://${this.variables.subdomain}/api/v4/leads?with=contacts&query=${phone}`;
      const response = await this.getRequest(url);
      
      if (response.status === 204 || !response._embedded || !response._embedded.leads) {
        return null;
      }
      
      // Filtrar leads que tengan el teléfono exacto
      const leadsWithPhone = response._embedded.leads.filter(lead => {
        if (lead._embedded && lead._embedded.contacts) {
          return lead._embedded.contacts.some(contact => {
            if (contact.custom_fields_values) {
              return contact.custom_fields_values.some(field => {
                // Buscar en cualquier campo que contenga "phone", "teléfono", "celular", etc.
                const fieldName = field.field_name ? field.field_name.toLowerCase() : '';
                const isPhoneField = fieldName.includes('phone') || 
                                   fieldName.includes('teléfono') || 
                                   fieldName.includes('celular') || 
                                   fieldName.includes('whatsapp');
                
                if (isPhoneField || field.field_code === 'PHONE') {
                  return field.values.some(value => 
                    value.value && value.value.includes(phone.slice(-10))
                  );
                }
                return false;
              });
            }
            return false;
          });
        }
        return false;
      });
      
      if (leadsWithPhone.length > 0) {
        return {
          leadId: leadsWithPhone[0].id,
          contactId: leadsWithPhone[0]._embedded.contacts[0].id,
          leadData: leadsWithPhone[0]
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error buscando leads por teléfono:", error);
      return null;
    }
  }

  async searchLeadsByPhone(phone) {
    try {
      // Usar la API de búsqueda de Kommo para encontrar leads por teléfono
      const searchQuery = encodeURIComponent(phone);
      const url = `https://${this.variables.subdomain}/api/v4/leads?with=contacts&query=${searchQuery}`;
      const response = await this.getRequest(url);
      
      if (response.status === 204 || !response._embedded || !response._embedded.leads) {
        return null;
      }
      
      // Buscar en los leads retornados por la búsqueda
      for (const lead of response._embedded.leads) {
        if (lead._embedded && lead._embedded.contacts) {
          for (const contact of lead._embedded.contacts) {
            if (contact.custom_fields_values) {
              for (const field of contact.custom_fields_values) {
                // Verificar si es un campo de teléfono
                if (field.values && field.values.length > 0) {
                  for (const value of field.values) {
                    if (value.value && value.value.includes(phone.slice(-10))) {
                      return {
                        leadId: lead.id,
                        contactId: contact.id,
                        leadData: lead
                      };
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error en búsqueda de leads por teléfono:", error);
      return null;
    }
  }

  async addNoteToLead(leadId, noteData) {
    const url = `https://${this.variables.subdomain}/api/v4/leads/${leadId}/notes`;
    return await this.postRequest(url, noteData);
  }
}

module.exports = { KommoApiClient };
