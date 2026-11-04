// A Country is one country record from the countries.dev API.
// It stores the facts shown on the destination page.
class Country {
  constructor(data) {
    if (!data || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Country data is incomplete.');
    }

    this.name = data.name;
    this.alpha2Code = data.alpha2Code || '';
    this.alpha3Code = data.alpha3Code || '';
    this.flag = data.flag || '';
    this.capital = data.capital || '';
    this.region = data.region || '';
    this.subregion = data.subregion || '';
    this.population =
      typeof data.population === 'number' ? data.population : 0;
    this.area = typeof data.area === 'number' ? data.area : 0;
    this.currencies = Array.isArray(data.currencies) ? data.currencies : [];
    this.languages = Array.isArray(data.languages) ? data.languages : [];
    this.callingCodes = Array.isArray(data.callingCodes)
      ? data.callingCodes
      : [];
    this.timezones = Array.isArray(data.timezones) ? data.timezones : [];
    this.demonym = data.demonym || '';
  }

  // Large numbers are easier to read as "32.4 million".
  getPopulationLabel() {
    if (!this.population) {
      return '';
    }

    if (this.population >= 1000000) {
      return `${(this.population / 1000000).toFixed(1)} million`;
    }

    if (this.population >= 1000) {
      return `${(this.population / 1000).toFixed(1)} thousand`;
    }

    return String(this.population);
  }

  getAreaLabel() {
    if (!this.area) {
      return '';
    }

    return `${this.area.toLocaleString('en-US')} km²`;
  }

  getCurrencyLabel() {
    const currency = this.currencies[0];

    if (!currency) {
      return '';
    }

    if (currency.symbol) {
      return `${currency.name} (${currency.symbol})`;
    }

    return currency.name || currency.code || '';
  }

  getLanguagesLabel() {
    const names = this.languages
      .map((language) => language.name)
      .filter(Boolean);

    return names.join(', ');
  }

  getCallingCodeLabel() {
    const code = this.callingCodes[0];

    return code ? `+${code}` : '';
  }

  getRegionLabel() {
    return [this.region, this.subregion].filter(Boolean).join(' · ');
  }

  getTimeZoneLabel() {
    if (this.timezones.length === 0) {
      return '';
    }

    // Some countries list many time zones, so keep the panel short.
    if (this.timezones.length <= 3) {
      return this.timezones.join(', ');
    }

    const shown = this.timezones.slice(0, 3).join(', ');
    return `${shown} +${this.timezones.length - 3} more`;
  }
}

module.exports = Country;
