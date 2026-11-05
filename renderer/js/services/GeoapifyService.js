const Destination = require('../models/Destination');
const Poi = require('../models/Poi');

// GeoapifyService manages geocoding and places search via Geoapify API.
class GeoapifyService {
  constructor(apiKey) {
    this.apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
    this.geocodingUrl = 'https://api.geoapify.com/v1/geocode/search';
    this.placesUrl = 'https://api.geoapify.com/v2/places';
    this.defaultPageSize = 16;
  }

  hasApiKey() {
    return this.apiKey.length > 0;
  }

  // Alias for searchDestinations
  async autocompletePlaces(query) {
    return this.searchDestinations(query);
  }

  // Search for matching countries and cities simultaneously
  async searchDestinations(query) {
    this.requireApiKey();

    const searchText = typeof query === 'string' ? query.trim() : '';
    if (searchText === '') {
      throw new Error('A country or city name is required.');
    }

    const responses = await Promise.allSettled([
      this.geocode(searchText, 'city'),
      this.geocode(searchText, 'country'),
    ]);

    const destinations = [];
    const seenIds = new Set();
    const seenLabels = new Set();
    let firstError = null;

    for (const response of responses) {
      if (response.status === 'rejected') {
        firstError = firstError || response.reason;
        continue;
      }

      for (const destination of response.value) {
        const id =
          destination.placeId ||
          `${destination.latitude},${destination.longitude}`;
        const label = `${destination.getTypeLabel()}:${destination.getDisplayName()}`;

        if (seenIds.has(id) || seenLabels.has(label)) {
          continue;
        }

        seenIds.add(id);
        seenLabels.add(label);
        destinations.push(destination);
      }
    }

    if (destinations.length === 0 && firstError) {
      throw firstError;
    }

    return destinations
      .sort(
        (first, second) =>
          second.confidence - first.confidence ||
          second.importance - first.importance
      )
      .slice(0, 10);
  }

  async geocode(query, type) {
    const url = new URL(this.geocodingUrl);
    url.searchParams.set('text', query);
    url.searchParams.set('type', type);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('limit', '6');
    url.searchParams.set('format', 'json');
    url.searchParams.set('apiKey', this.apiKey);

    const data = await this.request(url.toString());
    const results = Array.isArray(data.results) ? data.results : [];

    return results
      .filter(
        (item) => typeof item.lat === 'number' && typeof item.lon === 'number'
      )
      .map((item) => new Destination(item));
  }

  // Convenience helper that accepts either a Destination instance or lat/lon coordinates
  async getPlaces(destOrLat, lonOrCategories, categories, limit = 8) {
    if (destOrLat instanceof Destination || (typeof destOrLat === 'object' && destOrLat !== null)) {
      const cats = Array.isArray(lonOrCategories) ? lonOrCategories : categories;
      const res = await this.searchPlaces(destOrLat, cats, { limit: categories && typeof categories === 'number' ? categories : limit });
      return res.pois;
    }

    const tempDest = {
      latitude: destOrLat,
      longitude: lonOrCategories,
    };
    const res = await this.searchPlaces(tempDest, categories, { limit });
    return res.pois;
  }

  // Find places matching categories
  async searchPlaces(destination, categories, options = {}) {
    this.requireApiKey();

    if (!destination) {
      throw new Error('A country or city is required.');
    }

    const categoriesList = Array.isArray(categories)
      ? categories.filter(Boolean)
      : [];

    if (categoriesList.length === 0) {
      throw new Error('Choose at least one place category.');
    }

    const limit =
      Number.isInteger(options.limit) && options.limit > 0
        ? options.limit
        : this.defaultPageSize;

    const lat = destination.latitude !== undefined ? destination.latitude : destination.lat;
    const lon = destination.longitude !== undefined ? destination.longitude : destination.lon;

    const url = new URL(this.placesUrl);
    url.searchParams.set('categories', categoriesList.join(','));
    url.searchParams.set('filter', this.buildAreaFilter(destination));
    url.searchParams.set('bias', `proximity:${lon},${lat}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', '0');
    url.searchParams.set('lang', 'en');
    url.searchParams.set('apiKey', this.apiKey);

    const data = await this.request(url.toString());
    const features = Array.isArray(data.features) ? data.features : [];

    return {
      pois: features.map((feature) => new Poi(feature)),
    };
  }

  buildAreaFilter(destination) {
    if (destination.placeId) {
      return `place:${destination.placeId}`;
    }

    if (destination.bbox) {
      const { lon1, lat1, lon2, lat2 } = destination.bbox;
      return `rect:${lon1},${lat1},${lon2},${lat2}`;
    }

    const lat = destination.latitude !== undefined ? destination.latitude : destination.lat;
    const lon = destination.longitude !== undefined ? destination.longitude : destination.lon;
    return `circle:${lon},${lat},25000`;
  }

  requireApiKey() {
    if (!this.hasApiKey()) {
      throw new Error(
        'Geoapify API key is missing. Add geoapifyKey to .env.local and restart the app.'
      );
    }
  }

  async request(url) {
    let response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error('Unable to reach Geoapify. Check your internet connection.');
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Geoapify rejected the API key. Check geoapifyKey in .env.local.');
      }

      if (response.status === 429) {
        throw new Error('Geoapify rate limit reached. Please try again later.');
      }

      throw new Error(`Geoapify request failed (status ${response.status}).`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('Geoapify returned an unreadable response.');
    }
  }
}

module.exports = GeoapifyService;
