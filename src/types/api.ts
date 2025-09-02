/**
 * 🌟 External API Types
 * - Star Wars API (SWAPI) interfaces  
 * - OpenWeatherMap API interfaces
 * - Type-safe external integrations
 */

// ================================
// 🌟 SWAPI (Star Wars API) Types
// ================================

export interface SwapiCharacter {
  name: string;
  height: string;
  mass: string;
  hair_color: string;
  skin_color: string;
  eye_color: string;
  birth_year: string;
  gender: string;
  homeworld: string;
  films: string[];
  species: string[];
  vehicles: string[];
  starships: string[];
  created: string;
  edited: string;
  url: string;
}

export interface SwapiPlanet {
  name: string;
  rotation_period: string;
  orbital_period: string;
  diameter: string;
  climate: string;
  gravity: string;
  terrain: string;
  surface_water: string;
  population: string;
  residents: string[];
  films: string[];
  created: string;
  edited: string;
  url: string;
}

export interface SwapiFilm {
  title: string;
  episode_id: number;
  opening_crawl: string;
  director: string;
  producer: string;
  release_date: string;
  characters: string[];
  planets: string[];
  starships: string[];
  vehicles: string[];
  species: string[];
  created: string;
  edited: string;
  url: string;
}

export interface SwapiSpecies {
  name: string;
  classification: string;
  designation: string;
  average_height: string;
  skin_colors: string;
  hair_colors: string;
  eye_colors: string;
  average_lifespan: string;
  homeworld: string | null;
  language: string;
  people: string[];
  films: string[];
  created: string;
  edited: string;
  url: string;
}

export interface SwapiListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ================================
// 🌤️ OpenWeatherMap API Types
// ================================

export interface WeatherCoordinates {
  lon: number;
  lat: number;
}

export interface WeatherMain {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  sea_level?: number;
  grnd_level?: number;
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface WeatherWind {
  speed: number;
  deg: number;
  gust?: number;
}

export interface WeatherClouds {
  all: number;
}

export interface WeatherRain {
  '1h'?: number;
  '3h'?: number;
}

export interface WeatherSnow {
  '1h'?: number;
  '3h'?: number;
}

export interface WeatherSys {
  type?: number;
  id?: number;
  country: string;
  sunrise: number;
  sunset: number;
}

export interface OpenWeatherResponse {
  coord: WeatherCoordinates;
  weather: WeatherCondition[];
  base: string;
  main: WeatherMain;
  visibility: number;
  wind: WeatherWind;
  clouds: WeatherClouds;
  rain?: WeatherRain;
  snow?: WeatherSnow;
  dt: number;
  sys: WeatherSys;
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

// ================================
// 🔄 API Response Wrappers
// ================================

export interface ApiCallResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    status?: number;
    originalError?: any;
  };
  cached?: boolean;
  duration?: number;
  warning?: string;
}

export interface CacheMetadata {
  key: string;
  ttl: number;
  createdAt: number;
  source: 'swapi' | 'weather' | 'fusion';
}

// ================================
// 🎯 Normalized Data Types (Internal)
// ================================

export interface NormalizedCharacter {
  id: string;
  name: string;
  physicalAttributes: {
    height: number | null;        // cm
    mass: number | null;          // kg
    hairColor: string;
    skinColor: string;
    eyeColor: string;
  };
  biography: {
    birthYear: string;
    gender: string;
  };
  homeworld: {
    id: string;
    name: string;
    url: string;
  };
  affiliations: {
    films: string[];
    species: string[];
    vehicles: string[];
    starships: string[];
  };
  metadata: {
    created: string;
    edited: string;
    sourceUrl: string;
  };
}

export interface NormalizedPlanet {
  id: string;
  name: string;
  physicalProperties: {
    diameter: number | null;      // km
    rotationPeriod: number | null; // hours
    orbitalPeriod: number | null;  // days
    gravity: string;
    surfaceWater: number | null;   // percentage
  };
  environment: {
    climate: string[];
    terrain: string[];
  };
  population: {
    count: number | null;
    residents: string[];
  };
  coordinates?: {
    lat: number;
    lon: number;
  };
  metadata: {
    created: string;
    edited: string;
    sourceUrl: string;
  };
}

export interface NormalizedWeather {
  location: {
    name: string;
    country: string;
    coordinates: {
      lat: number;
      lon: number;
    };
  };
  current: {
    temperature: number;      // °C
    feelsLike: number;       // °C
    humidity: number;        // %
    pressure: number;        // hPa
    visibility: number;      // m
    windSpeed: number;       // km/h
    windDirection: number;   // degrees
  };
  conditions: {
    main: string;
    description: string;
    icon: string;
  };
  metadata: {
    timestamp: string;
    source: string;
    isFallback: boolean;
    originalError?: string;
    apiTimestamp?: string;
  };
}