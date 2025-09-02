/**
 * 📚 GET /history - Historial de datos con paginación
 * Retorna todas las respuestas almacenadas ordenadas cronológicamente
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '../utils/logger';
import { success, badRequest, internalError } from '../utils/response';
import { DatabaseService, HistoryQueryOptions } from '../services/databaseService';
import { API_LIMITS } from '../utils/constants';

/**
 * 🎯 Handler GET /history
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  
  const logger = Logger.create({
    requestId: event.requestContext.requestId,
    functionName: 'history',
    action: 'GET_history'
  });

  logger.lambdaStart(event);

  try {
    // Parsear query parameters
    const queryParams = event.queryStringParameters || {};
    
    // Parámetros de paginación
    const parsedLimit = parseInt(queryParams.limit || '10');
    const limit = isNaN(parsedLimit) ? -1 : Math.min(parsedLimit, API_LIMITS.MAX_PAGE_SIZE);
    const lastEvaluatedKey = queryParams.cursor || undefined;
    
    // Parámetros de filtrado
    const source = queryParams.source as 'fusion' | 'custom' | 'all' || 'all';
    const startTime = queryParams.startTime ? parseInt(queryParams.startTime) : undefined;
    const endTime = queryParams.endTime ? parseInt(queryParams.endTime) : undefined;

    // Validar parámetros
    if (limit < 1) {
      logger.warn('Invalid limit parameter', { limit: queryParams.limit });
      return badRequest(
        'Limit must be a positive integer',
        event.requestContext.requestId
      );
    }

    if (source && !['fusion', 'custom', 'all'].includes(source)) {
      logger.warn('Invalid source parameter', { source });
      return badRequest(
        'Source must be one of: fusion, custom, all',
        event.requestContext.requestId
      );
    }

    if (startTime && endTime && startTime > endTime) {
      logger.warn('Invalid time range', { startTime, endTime });
      return badRequest(
        'Start time cannot be greater than end time',
        event.requestContext.requestId
      );
    }

    logger.info('Processing history request', {
      limit,
      source,
      startTime,
      endTime,
      hasLastEvaluatedKey: !!lastEvaluatedKey
    });

    // Crear servicio de base de datos
    const dbService = new DatabaseService(logger);

    // Opciones de consulta
    const queryOptions: HistoryQueryOptions = {
      limit,
      lastEvaluatedKey,
      source,
      startTime,
      endTime
    };

    // Consultar historial
    const result = await dbService.getHistory(queryOptions);

    // Transformar datos para respuesta
    const responseData = {
      items: result.items.map(item => ({
        id: item.id,
        data: item.data,
        timestamp: item.timestamp,
        source: item.source,
        metadata: item.metadata,
        // Formatear timestamp para mejor legibilidad
        createdAt: new Date(item.timestamp).toISOString()
      })),
      pagination: {
        limit,
        count: result.count,
        hasNext: !!result.lastEvaluatedKey,
        nextCursor: result.lastEvaluatedKey || null,
        scannedCount: result.scannedCount
      },
      filters: {
        source,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null
      },
      meta: {
        source: 'history_database',
        requestId: event.requestContext.requestId,
        version: '1.0.0',
        queryTime: new Date().toISOString()
      }
    };

    logger.info('History retrieved successfully', {
      itemCount: result.count,
      scannedCount: result.scannedCount,
      hasNext: !!result.lastEvaluatedKey,
      source
    });

    logger.lambdaEnd(200);
    
    return success(responseData, event.requestContext.requestId, false, {
      count: result.count,
      source,
      filtered: !!(startTime || endTime || source !== 'all')
    });

  } catch (error: any) {
    logger.error('Unexpected error in history handler', error, {
      path: event.path,
      method: event.httpMethod,
      queryParams: event.queryStringParameters
    });

    logger.lambdaEnd(500);
    
    return internalError(
      'Failed to retrieve history',
      event.requestContext.requestId,
      error
    );
  }
};