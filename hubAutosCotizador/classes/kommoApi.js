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
  
    setAccessToken(token) {
      this.variables.access_token = token;
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
        return response.data;
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
  
    async updateLeadBulk(data) {
      const url = `https://${this.variables.subdomain}/api/v4/leads`;
      return await this.patchRequest(url, data);
    }
  
    async updateContactBulk(data) {
      const url = `https://${this.variables.subdomain}/api/v4/contacts`;
      return await this.patchRequest(url, data);
    }
  
    async updateContact(idContact, data) {
      const url = `https://${this.variables.subdomain}/api/v4/contacts/${idContact}`;
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
        response.data._embedded.contacts.length === 0
      ) {
        return false;
      }
      return this.get_value_by_trace(response.data, "_embedded.contacts.0.id");
    }
  
    async searchLeadByQuery(query) {
      const url = `https://${this.variables.subdomain}/api/v4/leads?query=${query}&with=contacts`;
      const response = await this.getRequest(url);
      if (response.status === 204) {
        return false;
      }
      const idLead = this.get_value_by_trace(
        response.data,
        "_embedded.leads.0.id"
      );
      const idContact = this.get_value_by_trace(
        response.data,
        "_embedded.leads.0._embedded.contacts.0.id"
      );
      return { idLead, idContact };
    }
  
    async getAllLeads() {
      const url = `https://${this.variables.subdomain}/api/v4/leads?with=contacts`;
      return await this.getRequest(url);
    }

    /**
 * Busca y retorna el nombre del status a partir de su id.
 *
 * @param {Array} pipelines - Array de pipelines.
 * @param {number} statusId - Id del status a buscar.
 * @returns {string|null} - Nombre del status o null si no se encuentra.
 */
findStatusName(pipelines, statusId) {
  for (const pipeline of pipelines) {
    if (pipeline._embedded && Array.isArray(pipeline._embedded.statuses)) {
      for (const status of pipeline._embedded.statuses) {
        if (status.id === statusId) {
          return status.name;
        }
      }
    }
  }
  return null;
}


  //get name status by id

    async getStatus(id) {
      const url = `https://${this.variables.subdomain}/api/v4/leads/pipelines`;
      const response = await this.getRequest(url);
      if (response.status === 204) {
        return false;
      }
      const pipelines = response._embedded.pipelines;
      const statusName = this.findStatusName(pipelines, id);
      if (statusName) {
        return statusName;
      } else {
        throw new Error(`Status with ID ${id} not found.`);
      }
    }

    async getAllLeadsFiltered(filter, page = 1) {
      const url = `https://${this.variables.subdomain}/api/v4/leads?with=contacts&page=${page}&limit=250&filter${filter}`;
      return await this.getRequest(url);
    }
  
    async getLeadDetail(id) {
      const url = `https://${this.variables.subdomain}/api/v4/leads/${id}?with=contacts`;
      return await this.getRequest(url);
    }
  
    async continueBot(urlContinue, data) {
      console.log("URL CONTINUE: ", urlContinue);
      console.log("DATA CONTINUE: ", data);
      return await this.postRequest(urlContinue, data);
    }
  
    async addNoteToLead(idLead, data) {
      const url = `https://${this.variables.subdomain}/api/v4/leads/${idLead}/notes`;
      return await this.postRequest(url, data);
    }
  
    async addIncomingLeads(data) {
      const url = `https://${this.variables.subdomain}/api/v4/leads/unsorted/forms`;
      return await this.postRequest(url, data);
    }
  
    formatFileUuid(array, obj) {
      let fileUuids = {};
      for (let i = 0; i < obj.length; i++) {
        const fieldId = obj[i].field_id;
        const element = array.find((item) => item.field_id === fieldId);
        if (element && element.values && element.values.length > 0) {
          const value = element.values[0].value;
          if (fieldId == 666286) {
            fileUuids.id_frontal = value.file_uuid;
          } else if (fieldId == 666288) {
            fileUuids.id_trasera = value.file_uuid;
          }
        }
      }
      return fileUuids;
    }
  
    async getFiles(fileId) {
      const url = `https://drive-g.kommo.com/v1.0/files/${fileId}`;
      return await this.getRequest(url);
    }
  
    async getUuidFiles(contactId) {
      const url = `https://${this.variables.subdomain}/api/v4/contacts/${contactId}`;
      const response = await this.getRequest(url);
      return this.formatFileUuid(response.custom_fields_values, [
        { field_id: 666288 },
        { field_id: 666286 },
      ]);
    }
  
    get_value_by_trace(obj, params) {
      let value = params.split(".").every((key) => (obj = obj[key])) && obj;
      return value ? value : false;
    }
  
    async runBot(botId, entityId) {
      const url = `https://${this.variables.subdomain}/api/v2/salesbot/run`;
      const data = {
        bot_id: botId,
        entity_id: entityId,
        entity_type: 2,
      };
      return await this.postRequest(url, [data]);
    }
  }

//EXPORT CLASE
module.exports = KommoApiClient;