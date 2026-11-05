// A Country represents country facts from countries.dev shown on the destination page.
class Country {
  constructor(data) {
    if (!data || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Country data is incomplete.');
    }

    this.name = data.name;
    this.alpha2Code = data.alpha2Code || '';
    this.capital = data.capital || '';
    this.region = data.region || '';
    this.subregion = data.subregion || '';
    this.population = typeof data.population === 'number' ? data.population : 0;
    this.currencies = Array.isArray(data.currencies) ? data.currencies : [];
    this.languages = Array.isArray(data.languages) ? data.languages : [];
  }

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

  getRegionLabel() {
    return [this.region, this.subregion].filter(Boolean).join(' · ');
  }
}

module.exports = Country;
