// Photo models an image returned from the Unsplash API.
// It stores the image dimensions, URLs, description, and attribution info
// adhering strictly to Unsplash API attribution guidelines.

class Photo {
  constructor(data) {
    if (!data || !data.urls) {
      throw new Error('Photo data is incomplete.');
    }

    this.id = data.id || '';
    this.width = data.width || 0;
    this.height = data.height || 0;
    this.color = data.color || '#e2e8f0';
    this.blurHash = data.blur_hash || '';
    this.description = data.description || data.alt_description || 'Destination photography';
    this.altDescription = data.alt_description || data.description || 'Travel destination';

    // Image URLs (raw, full, regular, small, thumb)
    this.urls = {
      raw: data.urls.raw || '',
      full: data.urls.full || '',
      regular: data.urls.regular || '',
      small: data.urls.small || '',
      thumb: data.urls.thumb || '',
    };

    // Photographer and attribution data
    const user = data.user || {};
    this.photographer = {
      name: user.name || 'Anonymous Photographer',
      username: user.username || '',
      portfolioUrl: (user.links && user.links.html) ? user.links.html : `https://unsplash.com/@${user.username || ''}`,
      profileImage: (user.profile_image && user.profile_image.small) ? user.profile_image.small : '',
    };

    // Unsplash link & download tracking location
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
    const url = new URL(this.links.html || 'https://unsplash.com');
    url.searchParams.set('utm_source', appName);
    url.searchParams.set('utm_medium', 'referral');
    return url.toString();
  }
}

module.exports = Photo;
