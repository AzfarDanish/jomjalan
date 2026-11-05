// Photo models an image returned from the Unsplash API.
class Photo {
  constructor(data) {
    if (!data || !data.urls) {
      throw new Error('Photo data is incomplete.');
    }

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
    };
  }

  get regularUrl() {
    return this.urls.regular;
  }

  getPhotographerAttributionUrl(appName = 'jomjalan') {
    const url = new URL(this.photographer.portfolioUrl);
    url.searchParams.set('utm_source', appName);
    url.searchParams.set('utm_medium', 'referral');
    return url.toString();
  }

  getUnsplashReferralUrl(appName = 'jomjalan') {
    const url = new URL(this.links.html);
    url.searchParams.set('utm_source', appName);
    url.searchParams.set('utm_medium', 'referral');
    return url.toString();
  }

  getCreditHtml(appName = 'jomjalan') {
    const photoUrl = this.getUnsplashReferralUrl(appName);
    const userUrl = this.getPhotographerAttributionUrl(appName);
    return `Photo by <a href="${userUrl}" target="_blank" rel="noopener">${this.photographer.name}</a> on <a href="${photoUrl}" target="_blank" rel="noopener">Unsplash</a>`;
  }
}

module.exports = Photo;
