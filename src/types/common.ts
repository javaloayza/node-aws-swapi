/**
 * 🏗️ Tipos comunes para toda la aplicación
 * Arquitectura: Types-first approach para mejor DX
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// ================================
// 🔧 AWS Lambda Types
// ================================

export interface LambdaContext {
  requestId: string;
  functionName: string;
  remainingTimeInMillis: () => number;
}

export type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: LambdaContext
) => Promise<APIGatewayProxyResult>;

// ================================
// 🌐 HTTP Response Types
// ================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
    cached?: boolean;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ================================
// 🗃️ Database Types
// ================================

export interface BaseEntity {
  pk: string;        // Partition Key
  sk: string;        // Sort Key
  timestamp: number; // Unix timestamp
  ttl?: number;      // TTL para auto-delete
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// ================================
// 🔐 Authentication Types
// ================================

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  role?: string;
}

// ================================
// 📊 Logging Types
// ================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId: string;
  functionName: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

// ================================
// ⚡ Cache Types
// ================================

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
}

export interface CacheOptions {
  ttl?: number;           // seconds
  tags?: string[];        // for cache invalidation
  compress?: boolean;     // for large objects
}

// ================================
// 🔄 Rate Limiting Types
// ================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;       // window in milliseconds
  maxRequests: number;    // max requests per window
  keyGenerator?: (event: APIGatewayProxyEvent) => string;
}

// ================================
// 🛠️ Utility Types
// ================================

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Partial<T> = { [P in keyof T]?: T[P] };
export type Required<T> = { [P in keyof T]-?: T[P] };

// Environment configuration
export interface AppConfig {
  stage: string;
  region: string;
  logLevel: LogLevel;
  jwtSecret: string;
  cacheTtl: number;
  openWeatherApiKey: string;
  dynamodbTable: string;
  cacheTable: string;
}

// ================================
// 🎯 Business Logic Types
// ================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    validationErrors?: ValidationError[];
  };
}