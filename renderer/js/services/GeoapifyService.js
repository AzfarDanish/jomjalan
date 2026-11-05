const Destination = require('../models/Destination');
const Poi = require('../models/Poi');

// This class is responsible only for talking to the Geoapify APIs.
// It returns Destination and Poi objects instead of raw API responses.
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

  getPageSize() {
    return this.defaultPageSize;
  }

  // Search for matching countries and cities at the same time.
  // Geoapify does not accept "type=city,country" in one request, so two
  // requests are sent and the results are merged.
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

  // Find places matching the selected categories inside a country or city.
  async searchPlaces(destination, categories, options = {}) {
    this.requireApiKey();

    if (!(destination instanceof Destination)) {
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
    const offset =
      Number.isInteger(options.offset) && options.offset >= 0
        ? options.offset
        : 0;

    const url = new URL(this.placesUrl);
    url.searchParams.set('categories', categoriesList.join(','));
    url.searchParams.set('filter', this.buildAreaFilter(destination));
    url.searchParams.set(
      'bias',
      `proximity:${destination.longitude},${destination.latitude}`
    );
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('lang', 'en');
    url.searchParams.set('apiKey', this.apiKey);

    const data = await this.request(url.toString());
    const features = Array.isArray(data.features) ? data.features : [];

    return {
      pois: features.map((feature) => new Poi(feature)),
      hasMore: features.length === limit,
    };
  }

  // Geoapify accepts a place boundary as a filter. This works for both
  // city and country place IDs. A bounding box is used as a fallback.
  buildAreaFilter(destination) {
    if (destination.placeId) {
      return `place:${destination.placeId}`;
    }

    if (destination.bbox) {
      const { lon1, lat1, lon2, lat2 } = destination.bbox;
      return `rect:${lon1},${lat1},${lon2},${lat2}`;
    }

    return `circle:${destination.longitude},${destination.latitude},25000`;
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
      throw new Error(
        'Unable to reach Geoapify. Check your internet connection.'
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'Geoapify rejected the API key. Check geoapifyKey in .env.local.'
        );
      }

      if (response.status === 429) {
        throw new Error('Geoapify rate limit reached. Please try again later.');
      }

      throw new Error(
        `Geoapify request failed (status ${response.status}).`
      );
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('Geoapify returned an unreadable response.');
    }
  }
}

module.exports = GeoapifyService;
