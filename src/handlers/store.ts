/**
 * 📝 POST /store - Store Custom Data
 * Allows saving custom user data in DynamoDB
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '../utils/logger';
import { success, badRequest, internalError, created } from '../utils/response';
import { DatabaseService } from '../services/databaseService';
import { API_LIMITS } from '../utils/constants';

interface StoreRequestBody {
  data: any;
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
  };
}

/**
 * 🎯 Handler POST /store
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  
  const logger = Logger.create({
    requestId: event.requestContext.requestId,
    functionName: 'store',
    action: 'POST_store'
  });

  logger.lambdaStart(event);

  try {
    // Validate that body exists
    if (!event.body) {
      logger.warn('No request body provided');
      return badRequest(
        'Request body is required',
        event.requestContext.requestId
      );
    }

    // Parse JSON from body
    let requestBody: StoreRequestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      logger.warn('Invalid JSON in request body', { body: event.body });
      return badRequest(
        'Invalid JSON format in request body',
        event.requestContext.requestId
      );
    }

    // Validate request structure
    if (!requestBody.data) {
      logger.warn('Missing data field in request body');
      return badRequest(
        'Field "data" is required',
        event.requestContext.requestId
      );
    }

    // Validate payload size
    const bodySize = JSON.stringify(requestBody.data).length;
    if (bodySize > API_LIMITS.MAX_CUSTOM_MESSAGE_LENGTH) {
      logger.warn('Request body too large', { 
        size: bodySize, 
        maxSize: API_LIMITS.MAX_CUSTOM_MESSAGE_LENGTH 
      });
      return badRequest(
        `Data too large. Maximum size: ${API_LIMITS.MAX_CUSTOM_MESSAGE_LENGTH} characters`,
        event.requestContext.requestId
      );
    }

    logger.info('Processing store request', { 
      dataSize: bodySize,
      hasMetadata: !!requestBody.metadata
    });

    // Create database service
    const dbService = new DatabaseService(logger);

    // Prepare data to store
    const dataToStore = {
      ...requestBody.data,
      ...(requestBody.metadata && { _metadata: requestBody.metadata })
    };

    // Extract information from context
    const userAgent = event.headers?.['User-Agent'] || event.headers?.['user-agent'];
    const clientIp = event.requestContext.identity?.sourceIp;

    // Store in DynamoDB
    const storedRecord = await dbService.storeCustomData(
      dataToStore,
      event.requestContext.requestId,
      userAgent,
      clientIp
    );

    logger.info('Data stored successfully', {
      recordId: storedRecord.id,
      timestamp: storedRecord.timestamp,
      dataSize: bodySize
    });

    // Successful response
    const responseData = {
      id: storedRecord.id,
      timestamp: storedRecord.timestamp,
      data: storedRecord.data,
      stored: true,
      meta: {
        source: 'custom_storage',
        requestId: event.requestContext.requestId,
        version: '1.0.0',
        size: bodySize
      }
    };

    logger.lambdaEnd(201);
    
    return created(responseData, event.requestContext.requestId);

  } catch (error: any) {
    logger.error('Unexpected error in store handler', error, {
      path: event.path,
      method: event.httpMethod,
      hasBody: !!event.body
    });

    logger.lambdaEnd(500);
    
    return internalError(
      'Failed to store data',
      event.requestContext.requestId,
      error
    );
  }
};