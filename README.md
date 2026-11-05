# JomJalan ✈️

**JomJalan** is an Electron-based desktop travel planning application built with modern Object-Oriented Programming (OOP) principles in JavaScript (ES6+). It helps travelers discover destinations worldwide, check live weather forecasts, explore country facts, convert currencies in real time, and organize custom itineraries.

---

## ✨ Features

- **🔍 Destination Search & Discovery**:
  - Global city and country search powered by the Open-Meteo Geocoding API.
  - Quick-search destination tags for popular spots.
  - Polymorphic destination models that format cities and countries cleanly.

- **⛅ Real-Time Weather & Suggested Activities**:
  - Live temperature, weather conditions, wind, and humidity from Open-Meteo.
  - Dynamic activity recommendations tailored to current weather and destination climate.

- **🏛️ Country Insights**:
  - Live country facts fetched from `countries.dev`, including capital, region, population, official currencies, and languages.

- **💱 Budget & Currency Converter**:
  - Interactive currency converter powered by the Frankfurter API.
  - Instant calculations with support for bidirectional swapping between Malaysian Ringgit (MYR) and foreign currencies.

- **📋 Trip Planning & Management (CRUD)**:
  - Create, view, edit, and delete travel itineraries.
  - Calculates daily budget estimates and attaches recommended activities.
  - Persisted locally with automatic validation safeguards.

---

## 🏛️ Object-Oriented Architecture (OOP)

The application follows clean OOP separation of responsibilities:

- **Models (`renderer/js/models/`)**:
  - `Destination`: Base geographic place class, with `CityDestination` and `CountryDestination` subclasses demonstrating inheritance and polymorphism (`getDisplayName()`, `getTypeLabel()`). Uses a static `create()` factory method.
  - `Trip`: Encapsulates trip itinerary data, input validation (`Trip.validate`), formatted date display, and budget calculations (`getDailyBudget`).
  - `Weather`: Encapsulates WMO weather codes, temperature, humidity, and wind labels.
  - `Country`: Models country statistics and regional information.
  - `CurrencyConversion`: Represents exchange calculations and rate formatting.

- **Services (`renderer/js/services/`)**:
  - `OpenMeteoService`: Handles location search and weather forecast API calls.
  - `CountryService`: Interfaces with the `countries.dev` REST API.
  - `CurrencyService`: Manages exchange rate fetching and conversion via Frankfurter API.

- **Business Logic (`renderer/js/logics/`)**:
  - `ActivityRecommender`: Evaluates destination climate and current weather conditions to recommend suitable travel activities.

- **Data Persistence (`renderer/js/data/`)**:
  - `TripRepository`: Encapsulates `localStorage` CRUD operations, ID handling, JSON serialization, and data integrity safeguards.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/azfardanish/jomjalan.git
   cd jomjalan
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the application:
   ```bash
   npm start
   ```

---

## 📁 Project Structure

```text
jomjalan/
├── main.js                  # Electron main process & live-reload watcher
├── package.json             # App scripts and dependencies
├── README.md                # Project documentation
├── renderer/                # User interface and renderer code
│   ├── discover.html        # Discover & search screen
│   ├── discover.js          # Discover controller
│   ├── destination.html     # Destination details, converter & planning screen
│   ├── destination.js       # Destination controller
│   ├── trips.html           # My Trips itinerary list screen
│   ├── trips.js             # Trips CRUD controller
│   ├── style.css            # Application styling
│   └── js/
│       ├── data/            # Persistence & repositories (TripRepository)
│       ├── logics/          # Business rules (ActivityRecommender)
│       ├── models/          # OOP Data Models (Destination, Trip, Weather, Country, etc.)
│       └── services/        # External API services (OpenMeteo, Country, Currency)
```
