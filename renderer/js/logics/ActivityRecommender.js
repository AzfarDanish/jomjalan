// ActivityRecommender analyzes both the selected country/region and current weather
// conditions using clear JavaScript control structures (switch and if...else)
// to generate relevant travel activity suggestions.
class ActivityRecommender {
  constructor() {
    // Weather condition thresholds
    this.rainyWeatherCodes = new Set([
      51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99
    ]);
    this.snowyWeatherCodes = new Set([71, 73, 75, 77, 85, 86]);
    this.foggyWeatherCodes = new Set([45, 48]);
  }

  // Primary method to evaluate country and weather conditions.
  recommend(destination, country, weather) {
    if (!destination) {
      return {
        destinationName: '',
        weatherSummary: '',
        suggestions: [],
        fallbackMessage: 'Select a destination to view tailored activity recommendations.'
      };
    }

    const destinationName = destination.getDisplayName();

    // If weather data is not available yet or failed to load
    if (!weather) {
      return {
        destinationName: destinationName,
        weatherSummary: 'Weather information unavailable',
        suggestions: [],
        fallbackMessage: 'Weather conditions are currently unavailable to generate personalized activity recommendations.'
      };
    }

    const weatherSummary = `${weather.getDescription()} (${weather.getTemperatureLabel()})`;
    const weatherCategory = this.determineWeatherCategory(weather);
    const countryCode = (country && country.alpha2Code
      ? country.alpha2Code
      : destination.countryCode || ''
    ).toUpperCase();
    const region = country && country.region ? country.region : '';

    const suggestions = [];

    // 1. Weather-based recommendation logic using switch statement
    switch (weatherCategory) {
      case 'rainy_or_stormy':
        suggestions.push(
          {
            title: 'Explore Local Museums & Art Galleries',
            description: 'Heavy rain or showers detected. Staying indoors while discovering local history, art, and cultural heritage is ideal today.',
            type: 'indoor'
          },
          {
            title: 'Indoor Shopping & Dining',
            description: 'Visit indoor shopping centers and covered food markets to enjoy local specialties comfortably sheltered from the rain.',
            type: 'indoor'
          }
        );
        break;

      case 'snowy':
        suggestions.push(
          {
            title: 'Winter Sightseeing & Snow Activities',
            description: 'Snow is falling! Great for scenic winter photography, winter sports, or visiting historic landmarks dressed in snow.',
            type: 'outdoor'
          },
          {
            title: 'Warm Cozy Cafes & Hearty Cuisine',
            description: 'After being outdoors in the cold, warm up with hot beverages and traditional comfort foods at local cafes.',
            type: 'indoor'
          }
        );
        break;

      case 'hot_and_clear':
        suggestions.push(
          {
            title: 'Early Morning or Late Afternoon Parks & Sights',
            description: 'High temperatures detected. Explore outdoor landmarks and botanical gardens during cooler morning or late afternoon hours.',
            type: 'outdoor'
          },
          {
            title: 'Air-Conditioned Attractions & Culinary Stops',
            description: 'Beat the midday heat by checking out indoor attractions, galleries, and refreshing cafe stops.',
            type: 'indoor'
          }
        );
        break;

      case 'pleasant_and_clear':
        suggestions.push(
          {
            title: 'Outdoor Walking Tour & Scenic Landmarks',
            description: 'Clear skies and comfortable temperatures create ideal conditions for walking tours, architectural sights, and photo opportunities.',
            type: 'outdoor'
          },
          {
            title: 'Parks, Nature Reserves & Waterfronts',
            description: 'Take full advantage of the pleasant weather by visiting open-air nature parks, public gardens, or waterfront promenades.',
            type: 'outdoor'
          }
        );
        break;

      case 'foggy':
        suggestions.push(
          {
            title: 'Historic Quarter Walk & Atmospheric Photography',
            description: 'Fog creates a unique, atmospheric backdrop for exploring historic streets, old town plazas, and temples or monuments.',
            type: 'outdoor'
          },
          {
            title: 'Cultural Centers & Exhibitions',
            description: 'Visibility might be limited for high viewpoints, making cultural centers and indoor exhibits a rewarding choice.',
            type: 'indoor'
          }
        );
        break;

      default:
        // Mild / overcast conditions
        suggestions.push(
          {
            title: 'City Highlights & Landmark Exploration',
            description: 'Overcast but dry conditions are very comfortable for exploring city attractions and architectural landmarks on foot.',
            type: 'general'
          }
        );
        break;
    }

    // 2. Country and regional custom recommendation logic using if...else statements
    if (countryCode === 'MY' || countryCode === 'SG') {
      // Tropical Southeast Asian destinations (Malaysia / Singapore)
      if (weatherCategory === 'rainy_or_stormy' || weather.temperature >= 32) {
        suggestions.push(
          {
            title: 'Explore Hawker Centers & Air-Conditioned Megamalls',
            description: 'In tropical climates, covered hawker centers and air-conditioned shopping malls offer world-class food and relief from the tropical heat or downpours.',
            type: 'indoor'
          }
        );
      } else {
        suggestions.push(
          {
            title: 'Visit Heritage Streets & Night Markets',
            description: 'Take a walking tour of historic colonial quarters, vibrant street art, and evening pasar malam (night markets).',
            type: 'outdoor'
          }
        );
      }
    } else if (countryCode === 'JP' || countryCode === 'KR') {
      // East Asian destinations (Japan / South Korea)
      if (weatherCategory === 'snowy' || weather.temperature < 5) {
        suggestions.push(
          {
            title: 'Relax at an Onsen/Jjimjilbang or Hot Noodle Spot',
            description: 'Cold weather is the perfect season to experience traditional hot springs or bathhouses, followed by hot ramen or stew.',
            type: 'indoor'
          }
        );
      } else if (weatherCategory === 'pleasant_and_clear') {
        suggestions.push(
          {
            title: 'Historic Shrines, Temples & Traditional Gardens',
            description: 'Stroll through peaceful temple gardens, historic palace grounds, and scenic traditional neighborhoods in beautiful weather.',
            type: 'outdoor'
          }
        );
      }
    } else if (countryCode === 'GB' || countryCode === 'FR' || countryCode === 'IT' || region === 'Europe') {
      // European destinations
      if (weatherCategory === 'rainy_or_stormy') {
        suggestions.push(
          {
            title: 'World-Renowned Art Museums & Historic Cathedrals',
            description: 'Spend rainy hours wandering renowned museums, historic churches, and covered passageways (passages couverts).',
            type: 'indoor'
          }
        );
      } else {
        suggestions.push(
          {
            title: 'Open-Air Piazza Strolls & Alfresco Cafe Culture',
            description: 'Soak up the historic European ambiance with an outdoor walking tour of plazas, followed by alfresco cafe dining.',
            type: 'outdoor'
          }
        );
      }
    } else if (countryCode === 'AU' || countryCode === 'NZ' || region === 'Oceania') {
      // Oceania destinations
      if (weatherCategory === 'pleasant_and_clear' || weatherCategory === 'hot_and_clear') {
        suggestions.push(
          {
            title: 'Coastal Walks, Harbor Tours & Beachfront Sightseeing',
            description: 'Sunny skies make it the prime time to enjoy coastal trails, public beaches, and outdoor harbor activities.',
            type: 'outdoor'
          }
        );
      }
    }

    // 3. Fallback check: Provide appropriate message if no suggestions matched
    if (suggestions.length === 0) {
      return {
        destinationName: destinationName,
        weatherSummary: weatherSummary,
        suggestions: [],
        fallbackMessage: 'No specific recommendations available for current conditions. Please browse available place categories below.'
      };
    }

    return {
        destinationName: destinationName,
        weatherSummary: weatherSummary,
        suggestions: suggestions,
        fallbackMessage: ''
      };
  }

  // Classify current weather based on WMO weather codes, temperature, and precipitation
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

    // High temperature with dry conditions
    if (typeof weather.temperature === 'number' && weather.temperature >= 32) {
      return 'hot_and_clear';
    }

    // Comfortable mild weather with low cloud cover
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
