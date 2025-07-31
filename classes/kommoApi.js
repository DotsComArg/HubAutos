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
}

module.exports = { KommoApiClient };
