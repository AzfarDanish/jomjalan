// ActivityRecommender generates travel activity suggestions based on country and weather.
class ActivityRecommender {
  constructor() {
    this.rainyWeatherCodes = new Set([
      51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99
    ]);
    this.snowyWeatherCodes = new Set([71, 73, 75, 77, 85, 86]);
    this.foggyWeatherCodes = new Set([45, 48]);
  }

  // Evaluates country and weather conditions
  recommend(destination, country, weather) {
    if (!destination || !weather) {
      return { suggestions: [] };
    }

    const weatherCategory = this.determineWeatherCategory(weather);
    const suggestions = [];

    switch (weatherCategory) {
      case 'rainy_or_stormy':
        suggestions.push(
          {
            title: 'Explore Local Museums & Art Galleries',
            category: 'Indoor Culture',
            bestTime: 'Rainy days',
            description: 'Heavy rain detected. Staying indoors while discovering local history, art, and heritage is ideal today.'
          },
          {
            title: 'Indoor Shopping & Dining',
            category: 'Indoor Dining',
            bestTime: 'Anytime',
            description: 'Visit indoor shopping centers and covered food markets to enjoy local specialties comfortably sheltered.'
          }
        );
        break;

      case 'snowy':
        suggestions.push(
          {
            title: 'Winter Sightseeing & Snow Activities',
            category: 'Winter Outdoor',
            bestTime: 'Daylight hours',
            description: 'Snow is falling! Great for scenic photography or visiting historic landmarks dressed in snow.'
          },
          {
            title: 'Warm Cozy Cafes & Hearty Cuisine',
            category: 'Dining',
            bestTime: 'Afternoon',
            description: 'Warm up with hot beverages and traditional comfort foods at local cafes.'
          }
        );
        break;

      case 'hot_and_clear':
        suggestions.push(
          {
            title: 'Early Morning Parks & Sights',
            category: 'Outdoor Sightseeing',
            bestTime: 'Morning or Evening',
            description: 'High temperatures detected. Explore outdoor landmarks during cooler morning or late afternoon hours.'
          },
          {
            title: 'Air-Conditioned Attractions & Culinary Stops',
            category: 'Indoor Culture',
            bestTime: 'Midday',
            description: 'Beat the midday heat by checking out indoor attractions, galleries, and refreshing cafe stops.'
          }
        );
        break;

      case 'pleasant_and_clear':
        suggestions.push(
          {
            title: 'Outdoor Walking Tour & Scenic Landmarks',
            category: 'Walking Tour',
            bestTime: 'Morning / Afternoon',
            description: 'Clear skies and comfortable temperatures create ideal conditions for walking tours and sights.'
          },
          {
            title: 'Parks, Nature Reserves & Waterfronts',
            category: 'Nature & Parks',
            bestTime: 'All day',
            description: 'Take full advantage of the pleasant weather by visiting open-air nature parks and waterfront promenades.'
          }
        );
        break;

      case 'foggy':
        suggestions.push(
          {
            title: 'Atmospheric Photography & Historic Quarter',
            category: 'Photography',
            bestTime: 'Morning',
            description: 'Misty weather adds dramatic atmosphere to ancient streets, historic quarters, and temples.'
          }
        );
        break;

      default:
        suggestions.push(
          {
            title: 'City Highlights & Landmark Walk',
            category: 'Sightseeing',
            bestTime: 'Flexible',
            description: 'Overcast skies provide soft lighting and comfortable conditions for sightseeing and city exploration.'
          }
        );
        break;
    }

    // Country/tropical climate additions
    const countryCode = (country && country.alpha2Code
      ? country.alpha2Code
      : destination.countryCode || ''
    ).toUpperCase();

    if (['MY', 'SG', 'TH', 'ID', 'PH', 'VN'].includes(countryCode)) {
      suggestions.push({
        title: 'Explore Hawker Centers & Food Markets',
        category: 'Food & Street Culture',
        bestTime: 'Evening / Meal times',
        description: 'Covered hawker centers and food markets offer world-class cuisine and authentic street food.'
      });
    }

    return { suggestions: suggestions.slice(0, 3) };
  }

  determineWeatherCategory(weather) {
    if (this.snowyWeatherCodes.has(weather.weatherCode)) {
      return 'snowy';
    }

    if (
      this.rainyWeatherCodes.has(weather.weatherCode) ||
      (typeof weather.precipitation === 'number' && weather.precipitation > 1.0)
    ) {
      return 'rainy_or_stormy';
    }

    if (this.foggyWeatherCodes.has(weather.weatherCode)) {
      return 'foggy';
    }

    if (typeof weather.temperature === 'number' && weather.temperature >= 32) {
      return 'hot_and_clear';
    }

    if (
      typeof weather.temperature === 'number' &&
      weather.temperature >= 16 &&
      weather.temperature < 32 &&
      (weather.weatherCode === 0 || weather.weatherCode === 1 || weather.weatherCode === 2)
    ) {
      return 'pleasant_and_clear';
    }

    return 'overcast_or_mild';
  }
}

module.exports = ActivityRecommender;
