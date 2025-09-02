/**
 * 🌟 GET /fusion - Merge SWAPI + Weather data
 * Main endpoint for the challenge
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '../utils/logger';
import { success, badRequest, internalError } from '../utils/response';
import { SwapiService } from '../services/swapiService';
import { WeatherService } from '../services/weatherService';
import { DatabaseService } from '../services/databaseService';
import { CacheService } from '../services/cacheService';

/**
 * 🎯 Main Handler - GET /fusion
 */
import { rateLimiter } from '../middleware/rateLimiter';

// Handler base
const baseHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  
  // Create logger with context
  const logger = Logger.create({
    requestId: event.requestContext.requestId,
    functionName: 'fusion',
    action: 'GET_fusion'
  });

  logger.lambdaStart(event);

  try {
    // Get character ID from query params (default: Luke Skywalker)
    const characterId = event.queryStringParameters?.character || '1';
    logger.info('Processing fusion request', { characterId });

    // Create services
    const swapiService = new SwapiService(logger);
    const weatherService = new WeatherService(logger);
    const dbService = new DatabaseService(logger);
    const cacheService = new CacheService(logger);

    // Check cache first
    const cacheKey = CacheService.fusionKey(characterId);
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached fusion data', { characterId, cacheKey });
      return success(cachedData, event.requestContext.requestId, true, {
        characterId,
        duration: 0,
        cached: true
      });
    }

    // Get character data
    const characterResult = await swapiService.getCharacter(characterId);

    if (!characterResult.success) {
      logger.warn('Failed to fetch character data', { characterId, error: characterResult.error });
      return badRequest(
        `Character ${characterId} not found or unavailable`,
        event.requestContext.requestId
      );
    }

    const character = characterResult.data!;
    logger.info('Character data fetched successfully', { 
      characterName: character.name,
      homeworldId: character.homeworld.id
    });

    // Get homeworld planet data
    const planetResult = await swapiService.getPlanet(character.homeworld.id);
    
    let planetData = {
      id: character.homeworld.id,
      name: 'Unknown',
      climate: 'Unknown',
      terrain: 'Unknown'
    };

    if (planetResult.success) {
      const planet = planetResult.data!;
      planetData = {
        id: planet.id,
        name: planet.name,
        climate: planet.environment.climate.join(', ') || 'Unknown',
        terrain: planet.environment.terrain.join(', ') || 'Unknown'
      };
      logger.info('Planet data fetched successfully', { planetName: planet.name });
    } else {
      logger.warn('Failed to fetch planet data', { planetId: character.homeworld.id, error: planetResult.error });
    }

    // Get weather data based on planet
    const weatherResult = await weatherService.getWeatherByPlanet(planetData.name);
    
    let weatherData: any = {
      status: 'unavailable',
      message: 'Weather service temporarily unavailable',
      source: 'mock'
    };

    if (weatherResult.success) {
      const weather = weatherResult.data!;
      weatherData = {
        location: weather.location.name,
        country: weather.location.country,
        temperature: weather.current.temperature,
        feelsLike: weather.current.feelsLike,
        humidity: weather.current.humidity,
        pressure: weather.current.pressure,
        windSpeed: weather.current.windSpeed,
        conditions: weather.conditions.description,
        source: weather.metadata.source,
        isFallback: weather.metadata.isFallback
      };
      
      if (weatherResult.warning) {
        logger.warn('Weather data warning', { warning: weatherResult.warning });
      }
    } else {
      logger.warn('Failed to fetch weather data', { planetName: planetData.name, error: weatherResult.error });
    }

    // Merge all data
    const fusionedData = {
      character: {
        id: character.id,
        name: character.name,
        height: character.physicalAttributes.height,
        mass: character.physicalAttributes.mass,
        hairColor: character.physicalAttributes.hairColor,
        eyeColor: character.physicalAttributes.eyeColor,
        birthYear: character.biography.birthYear,
        gender: character.biography.gender
      },
      homeworld: planetData,
      weather: weatherData,
      fusion: {
        summary: `${character.name} from ${planetData.name} - Currently ${weatherData.conditions || 'unknown conditions'}`,
        compatibility: calculatePlanetWeatherCompatibility(planetData.climate, weatherData),
        dataQuality: {
          character: 'complete',
          planet: planetResult.success ? 'complete' : 'partial',
          weather: weatherResult.success ? 'complete' : 'fallback'
        }
      },
      meta: {
        source: 'SWAPI + OpenWeatherMap',
        requestId: event.requestContext.requestId,
        version: '1.0.0',
        processingTime: {
          character: characterResult.duration || 0,
          planet: planetResult.duration || 0,
          weather: weatherResult.duration || 0
        }
      }
    };

    // Store in cache and database
    const totalProcessingTime = (characterResult.duration || 0) + (planetResult.duration || 0) + (weatherResult.duration || 0);
    
    // Save in cache for future requests (30 min TTL)
    await cacheService.set(cacheKey, fusionedData);
    
    try {
      await dbService.storeFusionData(
        characterId,
        fusionedData,
        event.requestContext.requestId,
        totalProcessingTime
      );
      logger.info('Fusion data stored in cache and database');
    } catch (dbError: any) {
      logger.warn('Failed to store fusion data in database', { error: dbError.message });
    }

    logger.lambdaEnd(200);
    
    return success(fusionedData, event.requestContext.requestId, false, {
      characterId,
      duration: totalProcessingTime,
      stored: true
    });

  } catch (error: any) {
    logger.error('Unexpected error in fusionados handler', error, { 
      path: event.path,
      method: event.httpMethod 
    });

    logger.lambdaEnd(500);
    
    return internalError(
      'Failed to process fusion request',
      event.requestContext.requestId,
      error
    );
  }
};

// Apply Rate Limiter middleware to base handler
export const handler = rateLimiter({
  requestsLimit: 100,        // 100 requests
  windowMinutes: 60          // per hour
})(baseHandler);

/**
 * 🔮 Calculate compatibility between planet climate and current weather
 */
function calculatePlanetWeatherCompatibility(planetClimate: string, weatherData: any): string {
  if (!weatherData || weatherData.source === 'mock') {
    return 'unknown';
  }

  const climate = planetClimate.toLowerCase();
  const temp = weatherData.temperature || 0;
  const conditions = weatherData.conditions?.toLowerCase() || '';

  // Desert planets
  if (climate.includes('desert')) {
    if (temp > 25 && conditions.includes('clear')) return 'perfect match';
    if (temp > 15) return 'good match';
    return 'poor match';
  }

  // Cold/frozen planets
  if (climate.includes('frozen') || climate.includes('cold')) {
    if (temp < 0) return 'perfect match';
    if (temp < 10) return 'good match';
    return 'poor match';
  }

  // Temperate planets
  if (climate.includes('temperate')) {
    if (temp >= 15 && temp <= 25) return 'perfect match';
    if (temp >= 5 && temp <= 30) return 'good match';
    return 'fair match';
  }

  // Tropical/jungle
  if (climate.includes('tropical') || climate.includes('jungle')) {
    if (temp > 20 && weatherData.humidity > 70) return 'perfect match';
    if (temp > 15) return 'good match';
    return 'fair match';
  }

  return 'fair match';
}