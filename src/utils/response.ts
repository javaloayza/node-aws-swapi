/**
 * 🌐 HTTP Response Utilities
 * - Consistent API responses
 * - CORS handling
 * - Error standardization
 * - Performance headers
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse, PaginatedResponse } from '../types/common';

/**
 * 🚀 Create standardized API response
 */
export const createResponse = (
  statusCode: number,
  body: ApiResponse | any,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  // Default CORS headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    ...headers
  };

  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body)
  };
};

/**
 * ✅ Success response
 */
export const success = <T>(
  data: T,
  requestId: string,
  cached = false,
  meta?: Record<string, any>
): APIGatewayProxyResult => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0',
      cached,
      ...meta
    }
  };

  return createResponse(200, response);
};

/**
 * 📄 Paginated success response
 */
export const successPaginated = <T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  requestId: string,
  cached = false
): APIGatewayProxyResult => {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      ...pagination,
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0',
      cached
    }
  };

  return createResponse(200, response);
};

/**
 * 📝 Created response (201)
 */
export const created = <T>(
  data: T,
  requestId: string,
  location?: string
): APIGatewayProxyResult => {
  const headers: Record<string, string> = {};
  if (location) {
    headers.Location = location;
  }

  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  return createResponse(201, response, headers);
};

/**
 * ❌ Bad Request (400)
 */
export const badRequest = (
  message: string,
  requestId: string,
  validationErrors?: Array<{ field: string; message: string; value?: any }>
): APIGatewayProxyResult => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'BAD_REQUEST',
      message,
      details: validationErrors
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  return createResponse(400, response);
};

/**
 * 🔐 Unauthorized (401)
 */
export const unauthorized = (
  message = 'Authentication required',
  requestId: string
): APIGatewayProxyResult => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  return createResponse(401, response);
};

/**
 * 🚫 Forbidden (403)
 */
export const forbidden = (
  message = 'Access denied',
  requestId: string
): APIGatewayProxyResult => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'FORBIDDEN',
      message
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  return createResponse(403, response);
};

/**
 * 🔍 Not Found (404)
 */
export const notFound = (
  message = 'Resource not found',
  requestId: string
): APIGatewayProxyResult => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  return createResponse(404, response);
};

/**
 * ⚡ Too Many Requests (429)
 */
export const tooManyRequests = (
  message = 'Rate limit exceeded',
  requestId: string,
  retryAfter?: number
): APIGatewayProxyResult => {
  const headers: Record<string, string> = {};
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      details: { retryAfter }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  return createResponse(429, response, headers);
};

/**
 * 🚨 Internal Server Error (500)
 */
export const internalError = (
  message = 'Internal server error',
  requestId: string,
  error?: any
): APIGatewayProxyResult => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      // Only include error details in development
      ...(process.env.NODE_ENV === 'development' && error && {
        details: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  return createResponse(500, response);
};

/**
 * 🔧 Service Unavailable (503)
 */
export const serviceUnavailable = (
  message = 'Service temporarily unavailable',
  requestId: string,
  retryAfter?: number
): APIGatewayProxyResult => {
  const headers: Record<string, string> = {};
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message,
      details: { retryAfter }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  return createResponse(503, response, headers);
};

/**
 * 🎯 Handle CORS preflight requests
 */
export const corsPreFlight = (): APIGatewayProxyResult => {
  return createResponse(200, '', {
    'Access-Control-Max-Age': '86400' // 24 hours
  });
};

/**
 * 📊 Health check response
 */
export const healthCheck = (requestId: string, status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'): APIGatewayProxyResult => {
  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  
  const response = {
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    requestId,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  return createResponse(statusCode, response);
};