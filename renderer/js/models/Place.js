// A Place is one result from the Open-Meteo geocoding API.
// It keeps the data and the display logic together (encapsulation).
class Place {
  constructor(data) {
    if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('Place data is incomplete.');
    }

    this.name = data.name || 'Unknown place';
    this.country = data.country || '';
    this.admin1 = data.admin1 || '';
    this.latitude = data.latitude;
    this.longitude = data.longitude;
  }

  // Places with the same name can exist in different regions,
  // so we include the region and country to tell them apart.
  getDisplayName() {
    const parts = [this.name];

    if (this.admin1 && this.admin1 !== this.name) {
      parts.push(this.admin1);
    }

    if (this.country && this.country !== this.name) {
      parts.push(this.country);
    }

    return parts.join(', ');
  }
}

module.exports = Place;
