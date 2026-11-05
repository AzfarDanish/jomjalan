const Country = require('../models/Country');

// CountryService communicates with the free countries.dev API.
class CountryService {
  constructor() {
    this.baseUrl = 'https://countries.dev';
    this.fields = [
      'name',
      'alpha2Code',
      'capital',
      'region',
      'subregion',
      'population',
      'currencies',
      'languages',
    ].join(',');
  }

  // Look up one country by its ISO alpha-2 or alpha-3 code.
  async getCountry(countryCode) {
    const code =
      typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';

    if (!/^[A-Z]{2,3}$/.test(code)) {
      throw new Error('A valid country code is required.');
    }

    const url = `${this.baseUrl}/alpha/${code}?fields=${encodeURIComponent(
      this.fields
    )}`;
    const data = await this.request(url);

    return new Country(data);
  }

  async request(url) {
    let response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(
        'Unable to reach the country service. Check your internet connection.'
      );
    }

    if (response.status === 404) {
      throw new Error('Country details are not available.');
    }

    if (!response.ok) {
      throw new Error(`Country request failed (status ${response.status}).`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('The country service returned an unreadable response.');
    }
  }
}

module.exports = CountryService;
