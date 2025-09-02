/**
 * 🧪 Jest Test Setup
 * - Environment variables
 * - Global mocks
 * - Test utilities
 */

// Load environment variables for testing
import * as dotenv from 'dotenv';
dotenv.config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.LOG_LEVEL = 'error'; // Suppress logs in tests
process.env.OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.CACHE_TTL_SECONDS = '1800';

// Global test timeout
jest.setTimeout(30000); // 30 seconds

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  // Helper to create mock logger
  createMockLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
    apiCall: jest.fn(),
    dbOperation: jest.fn(),
    lambdaStart: jest.fn(),
    lambdaEnd: jest.fn(),
    updateContext: jest.fn()
  }),

  // Helper to create mock context
  createMockContext: () => ({
    requestId: 'test-request-id',
    functionName: 'test-function',
    remainingTimeInMillis: () => 30000
  }),

  // Helper to create mock API Gateway event
  createMockEvent: (overrides = {}) => ({
    httpMethod: 'GET',
    path: '/test',
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    body: null,
    isBase64Encoded: false,
    requestContext: {
      requestId: 'test-request-id',
      stage: 'test',
      httpMethod: 'GET'
    },
    ...overrides
  })
};

// Type declaration for global test utils
declare global {
  var testUtils: {
    createMockLogger: () => any;
    createMockContext: () => any;
    createMockEvent: (overrides?: any) => any;
  };
}