/**
 * 🌟 Star Wars API (SWAPI) Service
 * - Character and planet data fetching
 * - Error handling and retries
 * - Data normalization
 * - Response caching
 */

import { AxiosResponse } from 'axios';
import { Logger } from '../utils/logger';
import { httpClient } from '../utils/httpClient';
import { API_URLS, MONITORING_CONFIG } from '../utils/constants';
import { 
  SwapiCharacter, 
  SwapiPlanet, 
  NormalizedCharacter, 
  NormalizedPlanet,
  ApiCallResult
} from '../types/api';

export class SwapiService {
  private readonly baseURL: string;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.baseURL = API_URLS.SWAPI_BASE;
    this.logger = logger;
  }

  /**
   * 👤 Get character by ID
   */
  async getCharacter(characterId: string): Promise<ApiCallResult<NormalizedCharacter>> {
    const startTime = Date.now();
    const url = `${this.baseURL}/people/${characterId}/`;

    try {
      this.logger.info(`Fetching SWAPI character: ${characterId}`, { characterId, url });

      const response: AxiosResponse<SwapiCharacter> = await httpClient.get(url);

      const duration = Date.now() - startTime;
      this.logger.apiCall('GET', url, response.status, duration);

      if (duration > MONITORING_CONFIG.PERFORMANCE_THRESHOLDS.API_CALL_WARNING) {
        this.logger.warn(`SWAPI character request took ${duration}ms`, { characterId, duration });
      }

      const normalizedCharacter = this.normalizeCharacter(response.data, characterId);

      return {
        success: true,
        data: normalizedCharacter,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorCode = this.getErrorCode(error);
      
      this.logger.error(`Failed to fetch SWAPI character: ${characterId}`, error, {
        characterId,
        url,
        duration,
        errorCode,
        status: error.response?.status
      });

      return {
        success: false,
        error: {
          code: errorCode,
          message: `Failed to fetch character ${characterId}: ${error.message}`,
          status: error.response?.status,
          originalError: error
        },
        duration
      };
    }
  }

  /**
   * 🌍 Get planet by ID
   */
  async getPlanet(planetId: string): Promise<ApiCallResult<NormalizedPlanet>> {
    const startTime = Date.now();
    const url = `${this.baseURL}/planets/${planetId}/`;

    try {
      this.logger.info(`Fetching SWAPI planet: ${planetId}`, { planetId, url });

      const response: AxiosResponse<SwapiPlanet> = await httpClient.get(url);

      const duration = Date.now() - startTime;
      this.logger.apiCall('GET', url, response.status, duration);

      const normalizedPlanet = this.normalizePlanet(response.data, planetId);

      return {
        success: true,
        data: normalizedPlanet,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorCode = this.getErrorCode(error);

      this.logger.error(`Failed to fetch SWAPI planet: ${planetId}`, error, {
        planetId,
        url,
        duration,
        errorCode,
        status: error.response?.status
      });

      return {
        success: false,
        error: {
          code: errorCode,
          message: `Failed to fetch planet ${planetId}: ${error.message}`,
          status: error.response?.status,
          originalError: error
        },
        duration
      };
    }
  }

  /**
   * 🔍 Get planet ID from character's homeworld URL
   */
  extractPlanetId(homeworldUrl: string): string {
    // URL format: https://swapi.dev/api/planets/1/
    const match = homeworldUrl.match(/\/planets\/(\d+)\//);
    return match ? match[1] : '1'; // Default to Tatooine if can't parse
  }

  /**
   * 🔄 Normalize character data
   */
  private normalizeCharacter(character: SwapiCharacter, id: string): NormalizedCharacter {
    return {
      id,
      name: character.name,
      physicalAttributes: {
        height: this.parseNumeric(character.height),
        mass: this.parseNumeric(character.mass),
        hairColor: character.hair_color,
        skinColor: character.skin_color,
        eyeColor: character.eye_color
      },
      biography: {
        birthYear: character.birth_year,
        gender: character.gender
      },
      homeworld: {
        id: this.extractPlanetId(character.homeworld),
        name: '', // Will be filled by planet data
        url: character.homeworld
      },
      affiliations: {
        films: character.films,
        species: character.species,
        vehicles: character.vehicles,
        starships: character.starships
      },
      metadata: {
        created: character.created,
        edited: character.edited,
        sourceUrl: character.url
      }
    };
  }

  /**
   * 🌍 Normalize planet data
   */
  private normalizePlanet(planet: SwapiPlanet, id: string): NormalizedPlanet {
    return {
      id,
      name: planet.name,
      physicalProperties: {
        diameter: this.parseNumeric(planet.diameter),
        rotationPeriod: this.parseNumeric(planet.rotation_period),
        orbitalPeriod: this.parseNumeric(planet.orbital_period),
        gravity: planet.gravity,
        surfaceWater: this.parseNumeric(planet.surface_water)
      },
      environment: {
        climate: this.parseCommaSeparated(planet.climate),
        terrain: this.parseCommaSeparated(planet.terrain)
      },
      population: {
        count: this.parseNumeric(planet.population),
        residents: planet.residents
      },
      metadata: {
        created: planet.created,
        edited: planet.edited,
        sourceUrl: planet.url
      }
    };
  }

  /**
   * 🔢 Parse numeric values (handle "unknown", "n/a", etc.)
   */
  private parseNumeric(value: string): number | null {
    if (!value || value.toLowerCase() === 'unknown' || value.toLowerCase() === 'n/a') {
      return null;
    }
    
    // Remove non-numeric characters except dots and commas
    const cleaned = value.replace(/[^0-9.,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * 📝 Parse comma-separated strings
   */
  private parseCommaSeparated(value: string): string[] {
    if (!value || value.toLowerCase() === 'unknown' || value.toLowerCase() === 'n/a') {
      return [];
    }
    
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  /**
   * 🚨 Determine error code from axios error
   */
  private getErrorCode(error: any): string {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return MONITORING_CONFIG.ERROR_CODES.SWAPI_TIMEOUT;
    }
    
    if (error.response?.status === 404) {
      return 'SWAPI_NOT_FOUND';
    }
    
    if (error.response?.status >= 500) {
      return 'SWAPI_SERVER_ERROR';
    }
    
    return 'SWAPI_ERROR';
  }
}