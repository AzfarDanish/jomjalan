// Photo models an image returned from the Unsplash API.
// It stores image URLs and attribution info per Unsplash API guidelines.

class Photo {
  constructor(data) {
    if (!data || !data.urls) {
      throw new Error('Photo data is incomplete.');
    }

    this.id = data.id || '';
    this.description = data.description || data.alt_description || 'Destination photography';

    this.urls = {
      regular: data.urls.regular || '',
      full: data.urls.full || '',
      small: data.urls.small || '',
    };

    const user = data.user || {};
    this.photographer = {
      name: user.name || 'Anonymous Photographer',
      portfolioUrl: (user.links && user.links.html) ? user.links.html : `https://unsplash.com/@${user.username || ''}`,
    };

    this.links = {
      html: (data.links && data.links.html) ? data.links.html : 'https://unsplash.com',
      downloadLocation: (data.links && data.links.download_location) ? data.links.download_location : '',
    };
  }

  // Returns UTM-tagged photographer link per Unsplash attribution requirements
  getPhotographerAttributionUrl(appName = 'jomjalan') {
    const url = new URL(this.photographer.portfolioUrl);
    url.searchParams.set('utm_source', appName);
    url.searchParams.set('utm_medium', 'referral');
    return url.toString();
  }

  // Returns UTM-tagged Unsplash referral link per Unsplash guidelines
  getUnsplashReferralUrl(appName = 'jomjalan') {
    const url = new URL(this.links.html);
    url.searchParams.set('utm_source', appName);
    url.searchParams.set('utm_medium', 'referral');
    return url.toString();
  }
}

module.exports = Photo;
