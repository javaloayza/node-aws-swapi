/**
 * 🛡️ Rate Limiter Middleware
 * Limits requests by IP/client to protect the API from abuse
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CacheService } from '../services/cacheService';
import { Logger } from '../utils/logger';
import { tooManyRequests } from '../utils/response';

// Default limit values (can be overridden)
const DEFAULT_REQUESTS_LIMIT = 100; // Maximum requests per window
const DEFAULT_WINDOW_MINUTES = 60;  // Time window (in minutes)

interface RateLimitOptions {
  requestsLimit?: number;  // Maximum number of requests allowed per window
  windowMinutes?: number;  // Time window in minutes
}

/**
 * Middleware to limit request rate by IP
 */
export const rateLimiter = (options: RateLimitOptions = {}) => {
  // Extract options with default values
  const requestsLimit = options.requestsLimit || DEFAULT_REQUESTS_LIMIT;
  const windowMinutes = options.windowMinutes || DEFAULT_WINDOW_MINUTES;
  
  // Create wrapper for the handler
  return (
    handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
  ) => {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      const logger = new Logger({
        requestId: event.requestContext.requestId,
        functionName: 'rateLimiter'
      });

      try {
        // Get client IP
        const clientIp = event.requestContext.identity?.sourceIp || 'unknown';
        
        // Load environment variables or use default values
        const envRequestsLimit = process.env.RATE_LIMIT_REQUESTS 
          ? parseInt(process.env.RATE_LIMIT_REQUESTS, 10) 
          : requestsLimit;
          
        const envWindowMinutes = process.env.RATE_LIMIT_WINDOW_MINUTES 
          ? parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) 
          : windowMinutes;

        // Create cache service
        const cacheService = new CacheService(logger);
        
        // Create cache key based on IP and path
        const path = event.path;
        const method = event.httpMethod;
        const rateKey = `rate_limit:${clientIp}:${method}:${path}`;
        
        // Get current request count
        const cachedData = await cacheService.get(rateKey);
        const count = cachedData ? parseInt(cachedData.count, 10) : 0;
        
        logger.debug('Rate limit check', { 
          clientIp, 
          path, 
          method, 
          currentCount: count,
          limit: envRequestsLimit,
          windowMinutes: envWindowMinutes 
        });

        // Check if limit has been exceeded
        if (count >= envRequestsLimit) {
          logger.warn('Rate limit exceeded', { 
            clientIp, 
            path, 
            count, 
            limit: envRequestsLimit 
          });
          
          return tooManyRequests(
            `Rate limit exceeded. Maximum ${envRequestsLimit} requests allowed per ${envWindowMinutes} minutes.`,
            event.requestContext.requestId
          );
        }
        
        // Increment counter and set TTL
        const ttlSeconds = envWindowMinutes * 60; // Convert minutes to seconds
        // Use ttl as a dynamic value without specific type
        await cacheService.set(rateKey, { count: count + 1 }, ttlSeconds as any);
        
        // Continue with the original handler
        return await handler(event);
      } catch (error: any) {
        // In case of rate limiter error, allow the request (fail open)
        logger.error('Rate limiter error', error, { 
          path: event.path, 
          method: event.httpMethod 
        });
        
        return await handler(event);
      }
    };
  };
};