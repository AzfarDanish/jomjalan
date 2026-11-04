// One category group is shown as one filter chip on the home page.
// It keeps the chip label and the Geoapify categories together.
class PlaceCategory {
  constructor(id, label, categories) {
    if (!id || !label || !Array.isArray(categories) || categories.length === 0) {
      throw new Error('A place category needs an id, label and categories.');
    }

    this.id = id;
    this.label = label;
    this.categories = categories.slice();
  }

  getApiCategories() {
    return this.categories.slice();
  }
}

// This catalog holds the category rules used by the home page.
// Keeping the rules here stops the UI class from hardcoding them.
class PlaceCategoryCatalog {
  constructor() {
    this.groups = [
      new PlaceCategory('highlights', 'Highlights', [
        'tourism.attraction',
        'tourism.sights',
        'entertainment.museum',
        'entertainment.culture',
        'heritage',
        'national_park',
        'leisure.park',
        'natural',
      ]),
      new PlaceCategory('attractions', 'Attractions', [
        'tourism.attraction',
      ]),
      new PlaceCategory('museums', 'Museums', [
        'entertainment.museum',
      ]),
      new PlaceCategory('sights', 'Sights & landmarks', [
        'tourism.sights',
        'tourism.attraction.viewpoint',
        'heritage.unesco',
      ]),
      new PlaceCategory('parks', 'Parks & nature', [
        'leisure.park',
        'national_park',
        'natural',
      ]),
      new PlaceCategory('food', 'Food & drink', [
        'catering.restaurant',
        'catering.cafe',
        'catering.fast_food',
      ]),
      new PlaceCategory('shopping', 'Shopping', [
        'commercial.shopping_mall',
        'commercial.marketplace',
        'commercial.gift_and_souvenir',
      ]),
      new PlaceCategory('hotels', 'Hotels', [
        'accommodation.hotel',
        'accommodation.hostel',
        'accommodation.guest_house',
      ]),
    ];
  }

  getGroups() {
    return this.groups.slice();
  }

  getDefaultGroup() {
    return this.groups[0];
  }
}

module.exports = PlaceCategoryCatalog;
