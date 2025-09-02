/**
 * 📊 Professional Logging System
 * - Structured logging for CloudWatch
 * - Request correlation
 * - Performance tracking
 * - Error context preservation
 */

import { LogLevel, LogContext } from '../types/common';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    memory: NodeJS.MemoryUsage;
  };
}

class Logger {
  private context: LogContext;
  private startTime: number;
  private readonly logLevel: LogLevel;

  constructor(context: LogContext) {
    this.context = context;
    this.startTime = Date.now();
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  /**
   * 🎯 Create logger instance with context
   */
  static create(context: LogContext): Logger {
    return new Logger(context);
  }

  /**
   * 🔍 Debug level logging
   */
  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.writeLog('debug', message, data);
    }
  }

  /**
   * ℹ️ Info level logging
   */
  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.writeLog('info', message, data);
    }
  }

  /**
   * ⚠️ Warning level logging
   */
  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.writeLog('warn', message, data);
    }
  }

  /**
   * 🚨 Error level logging
   */
  error(message: string, error?: Error | any, data?: any): void {
    if (this.shouldLog('error')) {
      const errorInfo = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error;

      this.writeLog('error', message, data, errorInfo);
    }
  }

  /**
   * ⏱️ Performance measurement
   */
  performance(action: string, data?: any): void {
    const duration = Date.now() - this.startTime;
    const memory = process.memoryUsage();

    this.info(`Performance: ${action}`, {
      ...data,
      performance: {
        duration,
        memory: {
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
        }
      }
    });
  }

  /**
   * 🔄 API call logging
   */
  apiCall(method: string, url: string, status?: number, duration?: number): void {
    this.info(`API Call: ${method} ${url}`, {
      http: {
        method,
        url,
        status,
        duration
      }
    });
  }

  /**
   * 💾 Database operation logging
   */
  dbOperation(operation: string, table: string, key?: string, duration?: number): void {
    this.info(`DB Operation: ${operation}`, {
      database: {
        operation,
        table,
        key,
        duration
      }
    });
  }

  /**
   * 🏗️ Lambda execution context
   */
  lambdaStart(event: any): void {
    this.info('Lambda execution started', {
      lambda: {
        httpMethod: event.httpMethod,
        path: event.path,
        pathParameters: event.pathParameters,
        queryStringParameters: event.queryStringParameters,
        headers: this.sanitizeHeaders(event.headers),
        remainingTime: this.context.requestId
      }
    });
  }

  lambdaEnd(statusCode: number): void {
    const duration = Date.now() - this.startTime;
    this.info('Lambda execution completed', {
      lambda: {
        statusCode,
        duration,
        memory: process.memoryUsage()
      }
    });
  }

  /**
   * 🔐 Update context (e.g., after auth)
   */
  updateContext(updates: Partial<LogContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * 📝 Write structured log entry
   */
  private writeLog(level: LogLevel, message: string, data?: any, error?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...(data && { data }),
      ...(error && { error })
    };

    // CloudWatch structured logging
    const logLine = JSON.stringify(logEntry);

    // Route to appropriate console method
    switch (level) {
      case 'debug':
        console.debug(logLine);
        break;
      case 'info':
        console.info(logLine);
        break;
      case 'warn':
        console.warn(logLine);
        break;
      case 'error':
        console.error(logLine);
        break;
    }
  }

  /**
   * 🎚️ Check if should log at level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * 🧹 Sanitize sensitive headers
   */
  private sanitizeHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'cookie', 'x-api-key'];
    
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
      if (sanitized[key.toLowerCase()]) {
        sanitized[key.toLowerCase()] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

/**
 * 🚀 Performance timer utility
 */
export class Timer {
  private startTime: number;
  private logger: Logger;
  private label: string;

  constructor(logger: Logger, label: string) {
    this.startTime = Date.now();
    this.logger = logger;
    this.label = label;
  }

  end(data?: any): number {
    const duration = Date.now() - this.startTime;
    this.logger.performance(this.label, { ...data, duration });
    return duration;
  }
}

/**
 * 📊 Export logger utilities
 */
export { Logger };
export default Logger;