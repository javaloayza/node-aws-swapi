/**
 * ⚙️ Application Constants & Configuration
 * - Environment variables validation
 * - Default values
 * - Type-safe configuration
 */

import { AppConfig, LogLevel } from '../types/common';

/**
 * 🔧 Load and validate environment configuration
 * NOTE: All values are hardcoded for simplicity and guaranteed functionality
 */
const loadConfig = (): AppConfig => {
  return {
    // AWS Configuration - HARDCODED
    stage: 'dev',
    region: 'us-east-1',
    
    // Application Configuration - HARDCODED
    logLevel: 'info' as LogLevel,
    
    // Security - Hardcoded for challenge demo (use environment variables in real projects)
    jwtSecret: 'b62d5d8da9464519ea4080bc75b6b08a26099afe5ccaa24ad40acc7cee48f940',
    
    // Cache Configuration - Hardcoded for challenge demo (use environment variables in real projects)
    cacheTtl: 1800, // 30 minutes
    
    // External APIs - Hardcoded for challenge demo (use environment variables in real projects)
    openWeatherApiKey: 'd47deab734da3f00b9571754d3daee8c',
    
    // Database Configuration - Hardcoded for challenge demo (use environment variables in real projects)
    dynamodbTable: 'stefanini-rimac-challenge-dev',
    cacheTable: 'stefanini-rimac-challenge-cache-dev'
  };
};

// Export singleton configuration
export const CONFIG = loadConfig();

/**
 * 🌍 External API URLs
 */
export const API_URLS = {
  SWAPI_BASE: 'https://swapi.dev/api',
  OPENWEATHER_BASE: 'https://api.openweathermap.org/data/2.5'
} as const;

/**
 * 🗃️ DynamoDB Table Configurations
 */
export const DB_CONFIG = {
  // Main table partition/sort keys
  MAIN_TABLE: {
    PK: 'pk',
    SK: 'sk',
    TTL: 'ttl',
    TIMESTAMP: 'timestamp'
  },
  
  // Cache table configuration
  CACHE_TABLE: {
    PK: 'cacheKey',
    TTL: 'ttl',
    VALUE: 'value'
  },
  
  // Entity prefixes for partition keys
  ENTITIES: {
    FUSIONED_DATA: 'FUSIONED',
    CUSTOM_DATA: 'CUSTOM', 
    HISTORY: 'HISTORY',
    USER: 'USER'
  },
  
  // GSI configuration
  INDEXES: {
    TIMESTAMP_INDEX: 'timestamp-index'
  }
} as const;

/**
 * 🔐 Authentication Configuration
 */
export const AUTH_CONFIG = {
  JWT_EXPIRY: '24h',
  JWT_ALGORITHM: 'HS256',
  
  // Rate limiting - HARDCODED
  RATE_LIMIT: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour hardcoded
    MAX_REQUESTS: 100 // 100 requests hardcoded
  }
} as const;

/**
 * ⚡ Cache Configuration
 */
export const CACHE_CONFIG = {
  DEFAULT_TTL: CONFIG.cacheTtl,
  
  // Specific TTLs for different data types
  TTL: {
    SWAPI_DATA: 3600,      // 1 hour - Star Wars data rarely changes
    WEATHER_DATA: 600,     // 10 minutes - Weather changes frequently
    FUSIONED_DATA: 1800,   // 30 minutes - As specified in requirements
    USER_DATA: 300         // 5 minutes - User-specific data
  },
  
  // Cache keys patterns
  KEYS: {
    SWAPI_CHARACTER: (id: string) => `swapi:character:${id}`,
    SWAPI_PLANET: (id: string) => `swapi:planet:${id}`,
    WEATHER: (lat: number, lon: number) => `weather:${lat}:${lon}`,
    FUSIONED: (characterId: string) => `fusioned:${characterId}`
  }
} as const;

/**
 * 🔢 API Response Limits
 */
export const API_LIMITS = {
  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // String lengths
  MAX_CUSTOM_MESSAGE_LENGTH: 1000,
  MAX_CHARACTER_NAME_LENGTH: 100,
  
  // Rate limiting
  REQUESTS_PER_MINUTE: 60,
  BURST_LIMIT: 10
} as const;

/**
 * 🌟 Star Wars Data Configuration
 */
export const SWAPI_CONFIG = {
  // Character IDs for popular characters (for demo/testing)
  POPULAR_CHARACTERS: {
    LUKE_SKYWALKER: '1',
    LEIA_ORGANA: '5',
    HAN_SOLO: '14',
    DARTH_VADER: '4',
    OBI_WAN: '10'
  },
  
  // Planet mappings for weather simulation
  PLANET_WEATHER_MAP: {
    'Tatooine': { climate: 'desert', terrain: 'desert' },
    'Alderaan': { climate: 'temperate', terrain: 'grasslands' },
    'Yavin IV': { climate: 'temperate', terrain: 'jungle' },
    'Hoth': { climate: 'frozen', terrain: 'tundra' },
    'Dagobah': { climate: 'murky', terrain: 'swamp' },
    'Bespin': { climate: 'temperate', terrain: 'gas giant' },
    'Endor': { climate: 'temperate', terrain: 'forest' },
    'Naboo': { climate: 'temperate', terrain: 'grassy hills' },
    'Coruscant': { climate: 'temperate', terrain: 'cityscape' }
  }
} as const;

/**
 * 🌤️ Weather API Configuration
 */
export const WEATHER_CONFIG = {
  // Default coordinates for unknown planets (Earth - Lima, Peru)
  DEFAULT_COORDS: {
    lat: -12.0464,
    lon: -77.0428
  },
  
  // Units
  UNITS: 'metric', // Celsius, km/h
  
  // Language
  LANG: 'en'
} as const;

/**
 * 📊 Monitoring & Logging
 */
export const MONITORING_CONFIG = {
  // Performance thresholds (milliseconds)
  PERFORMANCE_THRESHOLDS: {
    API_CALL_WARNING: 2000,    // 2 seconds
    API_CALL_ERROR: 5000,      // 5 seconds
    DB_OPERATION_WARNING: 500, // 500ms
    DB_OPERATION_ERROR: 2000   // 2 seconds
  },
  
  // Error codes
  ERROR_CODES: {
    SWAPI_TIMEOUT: 'SWAPI_TIMEOUT',
    WEATHER_TIMEOUT: 'WEATHER_TIMEOUT',
    WEATHER_API_ERROR: 'WEATHER_API_ERROR',
    WEATHER_UNAUTHORIZED: 'WEATHER_UNAUTHORIZED',
    WEATHER_NOT_FOUND: 'WEATHER_NOT_FOUND',
    WEATHER_SERVER_ERROR: 'WEATHER_SERVER_ERROR',
    CACHE_MISS: 'CACHE_MISS',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_FAILED: 'AUTH_FAILED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    DB_ERROR: 'DB_ERROR'
  }
} as const;

/**
 * 🎯 Validation Patterns
 */
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  CHARACTER_ID: /^[1-9]\d*$/, // Positive integers
  API_KEY: /^[a-zA-Z0-9]{32}$/ // 32 char alphanumeric
} as const;

/**
 * 🚀 Export commonly used values
 */
export const {
  stage,
  region,
  logLevel,
  dynamodbTable,
  cacheTable,
  openWeatherApiKey,
  jwtSecret,
  cacheTtl
} = CONFIG;