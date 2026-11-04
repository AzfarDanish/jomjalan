// Friendly names for the Geoapify place categories used by the home page.
const CATEGORY_LABELS = {
  'tourism.attraction': 'Attraction',
  'tourism.attraction.artwork': 'Public art',
  'tourism.attraction.artwork.mural': 'Mural',
  'tourism.attraction.artwork.sculpture': 'Sculpture',
  'tourism.attraction.artwork.statue': 'Statue',
  'tourism.attraction.clock': 'Clock',
  'tourism.attraction.fountain': 'Fountain',
  'tourism.attraction.viewpoint': 'Viewpoint',
  'tourism.sights': 'Sight',
  'tourism.sights.archaeological_site': 'Archaeological site',
  'tourism.sights.battlefield': 'Battlefield',
  'tourism.sights.building': 'Historic building',
  'tourism.sights.bridge': 'Bridge',
  'tourism.sights.castle': 'Castle',
  'tourism.sights.city_gate': 'City gate',
  'tourism.sights.city_hall': 'City hall',
  'tourism.sights.fort': 'Fort',
  'tourism.sights.lighthouse': 'Lighthouse',
  'tourism.sights.manor': 'Manor',
  'tourism.sights.memorial': 'Memorial',
  'tourism.sights.memorial.monument': 'Monument',
  'tourism.sights.mine': 'Mine',
  'tourism.sights.monastery': 'Monastery',
  'tourism.sights.place_of_worship': 'Place of worship',
  'tourism.sights.place_of_worship.cathedral': 'Cathedral',
  'tourism.sights.place_of_worship.chapel': 'Chapel',
  'tourism.sights.place_of_worship.church': 'Church',
  'tourism.sights.place_of_worship.mosque': 'Mosque',
  'tourism.sights.place_of_worship.shrine': 'Shrine',
  'tourism.sights.place_of_worship.synagogue': 'Synagogue',
  'tourism.sights.place_of_worship.temple': 'Temple',
  entertainment: 'Entertainment',
  'entertainment.museum': 'Museum',
  'entertainment.culture': 'Culture',
  'entertainment.culture.arts_centre': 'Arts centre',
  'entertainment.culture.gallery': 'Gallery',
  'entertainment.culture.theatre': 'Theatre',
  'entertainment.aquarium': 'Aquarium',
  'entertainment.zoo': 'Zoo',
  'entertainment.theme_park': 'Theme park',
  'entertainment.water_park': 'Water park',
  'entertainment.planetarium': 'Planetarium',
  heritage: 'Heritage',
  'heritage.unesco': 'UNESCO site',
  national_park: 'National park',
  'leisure.park': 'Park',
  'leisure.park.garden': 'Garden',
  'leisure.park.nature_reserve': 'Nature reserve',
  'leisure.picnic': 'Picnic spot',
  natural: 'Nature',
  'natural.coastal': 'Coast',
  'natural.forest': 'Forest',
  'natural.mountain': 'Mountain',
  'natural.mountain.peak': 'Mountain peak',
  'natural.mountain.volcano': 'Volcano',
  'natural.water': 'Water',
  'natural.water.hot_spring': 'Hot spring',
  'natural.water.spring': 'Spring',
  'natural.sand': 'Beach',
  'natural.sand.dune': 'Dune',
  'natural.wetland': 'Wetland',
  'catering.restaurant': 'Restaurant',
  'catering.cafe': 'Cafe',
  'catering.fast_food': 'Fast food',
  'catering.bar': 'Bar',
  'catering.pub': 'Pub',
  'commercial.shopping_mall': 'Shopping mall',
  'commercial.marketplace': 'Market',
  'commercial.gift_and_souvenir': 'Souvenir shop',
  'accommodation.hotel': 'Hotel',
  'accommodation.hostel': 'Hostel',
  'accommodation.guest_house': 'Guest house',
  'activity.events_venue': 'Events venue',
};

// Categories such as "wheelchair.yes" or "no_fee.no" describe a place but are
// not useful as the main category label.
const CONDITION_PREFIXES = [
  'no_fee',
  'wheelchair',
  'dogs',
  'payment',
  'internet_access',
  'smoking',
  'organic',
  'vegetarian',
  'vegan',
  'cuisine',
];

// A Poi is one feature from the Geoapify Places API.
// It extends Location (inheriting name, latitude, longitude) and adds POI-specific data.
const Destination = require('./Destination');
const Location = Destination.Location;

class Poi extends Location {
  constructor(feature) {
    const data = feature && feature.properties ? feature.properties : feature;

    if (!data || typeof data.lat !== 'number' || typeof data.lon !== 'number') {
      throw new Error('Place data is incomplete.');
    }

    const poiName = data.name || data.address_line1 || 'Unnamed place';
    super(poiName, data.lat, data.lon);

    this.address = data.formatted || data.address_line1 || '';
    this.placeId = data.place_id || '';
    this.distance = typeof data.distance === 'number' ? data.distance : null;
    this.categories = Array.isArray(data.categories) ? data.categories : [];
    this.categoryLabel = this.resolveCategoryLabel();
  }

  resolveCategoryLabel() {
    const usefulCategories = this.categories.filter(
      (category) =>
        category &&
        !CONDITION_PREFIXES.some(
          (prefix) => category === prefix || category.startsWith(`${prefix}.`)
        )
    );

    // Geoapify lists categories from general to specific, so read backwards.
    for (let index = usefulCategories.length - 1; index >= 0; index -= 1) {
      const label = CATEGORY_LABELS[usefulCategories[index]];

      if (label) {
        return label;
      }
    }

    const fallback = usefulCategories[usefulCategories.length - 1];

    if (!fallback) {
      return 'Place';
    }

    const lastPart = fallback.split('.').pop();

    return lastPart
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  getDistanceLabel() {
    if (typeof this.distance !== 'number') {
      return '';
    }

    if (this.distance < 1000) {
      return `${Math.round(this.distance)} m away`;
    }

    return `${(this.distance / 1000).toFixed(1)} km away`;
  }
}

module.exports = Poi;
