/**
 * 🌤️ OpenWeatherMap API Service
 * - Current weather data fetching
 * - Error handling and retries
 * - Data normalization
 * - Response caching
 */

import { AxiosResponse } from 'axios';
import { Logger } from '../utils/logger';
import { httpClient } from '../utils/httpClient';
import { API_URLS, MONITORING_CONFIG } from '../utils/constants';
import { 
  OpenWeatherResponse, 
  NormalizedWeather,
  ApiCallResult
} from '../types/api';

export class WeatherService {
  private readonly baseURL: string;
  private readonly logger: Logger;
  private readonly apiKey: string;

  constructor(logger: Logger) {
    this.baseURL = API_URLS.OPENWEATHER_BASE;
    this.logger = logger;
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    
    if (!this.apiKey) {
      this.logger.warn('OpenWeatherMap API key not found', { 
        hasKey: !!this.apiKey,
        envVar: 'OPENWEATHER_API_KEY'
      });
    }
  }

  /**
   * 🌍 Get weather by planet name/coordinates
   */
  async getWeatherByPlanet(planetName: string): Promise<ApiCallResult<NormalizedWeather>> {
    const startTime = Date.now();
    
    try {
      // For SWAPI planets, we'll use a mapping to real locations
      // or use the planet name as a city approximation
      const location = this.mapPlanetToLocation(planetName);
      
      this.logger.info(`Fetching weather for planet: ${planetName}`, { 
        planetName, 
        location,
        hasApiKey: !!this.apiKey
      });

      if (!this.apiKey) {
        return this.getMockWeatherData(planetName, Date.now() - startTime);
      }

      const url = `${this.baseURL}/weather`;
      const params = {
        q: location,
        appid: this.apiKey,
        units: 'metric' // Celsius, m/s, etc.
      };

      const response: AxiosResponse<OpenWeatherResponse> = await httpClient.get(url, { params });

      const duration = Date.now() - startTime;
      this.logger.apiCall('GET', url, response.status, duration);

      if (duration > MONITORING_CONFIG.PERFORMANCE_THRESHOLDS.API_CALL_WARNING) {
        this.logger.warn(`Weather API request took ${duration}ms`, { planetName, location, duration });
      }

      const normalizedWeather = this.normalizeWeather(response.data, planetName);

      return {
        success: true,
        data: normalizedWeather,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorCode = this.getErrorCode(error);
      
      this.logger.error(`Failed to fetch weather for planet: ${planetName}`, error, {
        planetName,
        duration,
        errorCode,
        status: error.response?.status,
        hasApiKey: !!this.apiKey
      });

      // Fallback to mock data on error
      return this.getMockWeatherData(planetName, duration, error);
    }
  }

  /**
   * 🗺️ Map SWAPI planet names to real locations
   */
  private mapPlanetToLocation(planetName: string): string {
    const planetLocationMap: { [key: string]: string } = {
      'Tatooine': 'Tucson,US',      // Desert planet → Arizona desert
      'Alderaan': 'Geneva,CH',      // Peaceful planet → Switzerland  
      'Yavin IV': 'Manaus,BR',      // Jungle moon → Amazon
      'Hoth': 'Anchorage,US',       // Ice planet → Alaska
      'Dagobah': 'New Orleans,US',  // Swamp planet → Louisiana
      'Bespin': 'Denver,US',        // Cloud city → Mile high city
      'Endor': 'Vancouver,CA',      // Forest moon → Pacific Northwest
      'Naboo': 'Rome,IT',           // Beautiful planet → Italy
      'Coruscant': 'New York,US',   // City planet → NYC
      'Kamino': 'Reykjavik,IS'      // Ocean planet → Iceland
    };

    return planetLocationMap[planetName] || 'London,UK'; // Default fallback
  }

  /**
   * 🎭 Generate mock weather data when API is unavailable
   */
  private getMockWeatherData(planetName: string, duration: number, error?: any): ApiCallResult<NormalizedWeather> {
    const mockData: NormalizedWeather = {
      location: {
        name: planetName,
        country: 'Galaxy Far Far Away',
        coordinates: { lat: 0, lon: 0 }
      },
      current: {
        temperature: Math.round(Math.random() * 40 - 10), // -10 to 30°C
        feelsLike: Math.round(Math.random() * 40 - 10),
        humidity: Math.round(Math.random() * 100),
        pressure: Math.round(1000 + Math.random() * 50),
        visibility: Math.round(Math.random() * 10000),
        windSpeed: Math.round(Math.random() * 20),
        windDirection: Math.round(Math.random() * 360)
      },
      conditions: {
        main: ['Clear', 'Clouds', 'Rain', 'Mist'][Math.floor(Math.random() * 4)],
        description: 'Simulated weather conditions',
        icon: '01d'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'MOCK_DATA',
        isFallback: true,
        originalError: error?.message
      }
    };

    return {
      success: true,
      data: mockData,
      duration,
      warning: 'Using mock weather data - API unavailable'
    };
  }

  /**
   * 🔄 Normalize OpenWeatherMap response
   */
  private normalizeWeather(weather: OpenWeatherResponse, planetName: string): NormalizedWeather {
    return {
      location: {
        name: weather.name || planetName,
        country: weather.sys?.country || 'Unknown',
        coordinates: {
          lat: weather.coord?.lat || 0,
          lon: weather.coord?.lon || 0
        }
      },
      current: {
        temperature: Math.round(weather.main.temp),
        feelsLike: Math.round(weather.main.feels_like),
        humidity: weather.main.humidity,
        pressure: weather.main.pressure,
        visibility: weather.visibility || 0,
        windSpeed: Math.round((weather.wind?.speed || 0) * 3.6), // Convert m/s to km/h
        windDirection: weather.wind?.deg || 0
      },
      conditions: {
        main: weather.weather[0]?.main || 'Unknown',
        description: weather.weather[0]?.description || 'No description',
        icon: weather.weather[0]?.icon || '01d'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'OPENWEATHERMAP',
        isFallback: false,
        apiTimestamp: weather.dt ? new Date(weather.dt * 1000).toISOString() : undefined
      }
    };
  }

  /**
   * 🚨 Determine error code from axios error
   */
  private getErrorCode(error: any): string {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return MONITORING_CONFIG.ERROR_CODES.WEATHER_TIMEOUT;
    }
    
    if (error.response?.status === 401) {
      return 'WEATHER_UNAUTHORIZED';
    }
    
    if (error.response?.status === 404) {
      return 'WEATHER_NOT_FOUND';
    }
    
    if (error.response?.status >= 500) {
      return 'WEATHER_SERVER_ERROR';
    }
    
    return 'WEATHER_ERROR';
  }
}