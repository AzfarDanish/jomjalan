// Base Destination represents any geographical place with coordinates.
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
    return false;
  }

  getDisplayName() {
    return this.name;
  }

  getTypeLabel() {
    return 'Place';
  }

  // Factory method to instantiate the appropriate subclass (Polymorphism)
  static create(data) {
    if (!data) return null;
    const type = data.result_type || (data.feature_code === 'PCLI' ? 'country' : 'city');
    if (type === 'country') {
      return new CountryDestination(data);
    }
    return new CityDestination(data);
  }
}

// Subclass for City destinations
class CityDestination extends Destination {
  constructor(data) {
    super(data);
    this.resultType = 'city';
  }

  getDisplayName() {
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
    return 'City';
  }
}

// Subclass for Country destinations
class CountryDestination extends Destination {
  constructor(data) {
    super(data);
    this.resultType = 'country';
  }

  isCountry() {
    return true;
  }

  getDisplayName() {
    return this.name;
  }

  getTypeLabel() {
    return 'Country';
  }
}

Destination.CityDestination = CityDestination;
Destination.CountryDestination = CountryDestination;

module.exports = Destination;
