// A Destination represents a country or city result for travel planning.
class Destination {
  constructor(data) {
    if (!data || typeof data.lat !== 'number' || typeof data.lon !== 'number') {
      throw new Error('Destination data is incomplete.');
    }

    this.name = data.name || data.country || 'Unknown place';
    this.latitude = data.lat;
    this.longitude = data.lon;

    this.country = data.country || '';
    this.countryCode = (data.country_code || '').toLowerCase();
    this.state = data.state || '';
    this.resultType = data.result_type || 'city';
    this.formatted = data.formatted || this.name;
  }

  isCountry() {
    return this.resultType === 'country';
  }

  // Cities can share a name, so the region and country are included.
  getDisplayName() {
    if (this.isCountry()) {
      return this.name;
    }

    const parts = [this.name];

    if (this.state && this.state !== this.name) {
      parts.push(this.state);
    }

    if (this.country && this.country !== this.name) {
      parts.push(this.country);
    }

    return parts.join(', ');
  }

  getTypeLabel() {
    return this.isCountry() ? 'Country' : 'City';
  }
}

module.exports = Destination;
