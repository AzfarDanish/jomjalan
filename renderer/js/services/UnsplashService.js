const Photo = require('../models/Photo');

// UnsplashService communicates with the official Unsplash API (https://api.unsplash.com/).
// It searches high-quality destination photography and caches results to optimize performance.

class UnsplashService {
  constructor(accessKey = '') {
    this.accessKey = typeof accessKey === 'string' ? accessKey.trim() : '';
    this.baseUrl = 'https://api.unsplash.com';
    this.cache = new Map();
  }

  hasAccessKey() {
    return this.accessKey.length > 0;
  }

  // Search photos for a given destination name / query
  async searchPhotos(query, perPage = 4) {
    if (!this.hasAccessKey()) {
      return [];
    }

    const cleanQuery = typeof query === 'string' ? query.trim() : '';
    if (!cleanQuery) {
      return [];
    }

    const cacheKey = `${cleanQuery.toLowerCase()}_${perPage}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Build URL with travel keywords and orientation for clean visual display
    const url = new URL(`${this.baseUrl}/search/photos`);
    url.searchParams.set('query', `${cleanQuery} travel destination`);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('orientation', 'landscape');

    let response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });
    } catch (networkError) {
      throw new Error('Unable to reach Unsplash. Please check your network connection.');
    }

    if (response.status === 403) {
      throw new Error('Unsplash API rate limit exceeded or invalid access key.');
    }

    if (!response.ok) {
      throw new Error(`Unsplash request failed (status ${response.status}).`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Failed to parse Unsplash response.');
    }

    const results = Array.isArray(data.results) ? data.results : [];
    const photos = results.map((item) => new Photo(item));

    // Cache the result
    this.cache.set(cacheKey, photos);
    return photos;
  }

  // Report download event according to Unsplash API terms
  async triggerDownload(downloadLocation) {
    if (!this.hasAccessKey() || !downloadLocation) {
      return;
    }

    try {
      await fetch(downloadLocation, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
      });
    } catch (e) {
      // Background tracking failure should not disrupt user experience
    }
  }
}

module.exports = UnsplashService;
