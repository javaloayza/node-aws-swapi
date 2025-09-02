/**
 * 🗄️ Database Service - DynamoDB Operations
 * - CRUD operations for fusion data and custom data
 * - History tracking with chronological ordering
 * - Pagination support
 * - TTL management for cache
 */

import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand, 
  QueryCommand, 
  ScanCommand, 
  UpdateItemCommand,
  DeleteItemCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { DB_CONFIG, CONFIG, CACHE_CONFIG } from '../utils/constants';

export interface FusionDataRecord {
  id: string;
  characterId: string;
  data: any;
  timestamp: number;
  ttl?: number;
  source: 'fusion' | 'custom';
  metadata?: {
    requestId: string;
    processingTime: number;
    cached: boolean;
  };
}

export interface CustomDataRecord {
  id: string;
  data: any;
  timestamp: number;
  source: 'custom';
  metadata?: {
    requestId: string;
    userAgent?: string;
    ip?: string;
  };
}

export interface HistoryQueryOptions {
  limit?: number;
  lastEvaluatedKey?: string;
  source?: 'fusion' | 'custom' | 'all';
  startTime?: number;
  endTime?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  lastEvaluatedKey?: string;
  count: number;
  scannedCount?: number;
}

export class DatabaseService {
  private readonly client: DynamoDBClient;
  private readonly tableName: string;
  private readonly cacheTableName: string;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.client = new DynamoDBClient({ 
      region: CONFIG.region
      // Removed local DynamoDB endpoint - using AWS DynamoDB directly
    });
    this.tableName = CONFIG.dynamodbTable;
    this.cacheTableName = CONFIG.cacheTable;
    this.logger = logger;
  }

  /**
   * 💾 Store fusion data with automatic TTL
   */
  async storeFusionData(
    characterId: string, 
    data: any, 
    requestId: string,
    processingTime: number = 0
  ): Promise<FusionDataRecord> {
    const startTime = Date.now();
    const timestamp = Date.now();
    const id = uuidv4();
    
    const record: FusionDataRecord = {
      id,
      characterId,
      data,
      timestamp,
      ttl: Math.floor(Date.now() / 1000) + CACHE_CONFIG.TTL.FUSIONED_DATA, // 30 minutes
      source: 'fusion',
      metadata: {
        requestId,
        processingTime,
        cached: false
      }
    };

    try {
      const item = marshall({
        [DB_CONFIG.MAIN_TABLE.PK]: `${DB_CONFIG.ENTITIES.FUSIONED_DATA}#${characterId}`,
        [DB_CONFIG.MAIN_TABLE.SK]: `FUSION#${timestamp}#${id}`,
        [DB_CONFIG.MAIN_TABLE.TIMESTAMP]: timestamp,
        [DB_CONFIG.MAIN_TABLE.TTL]: record.ttl,
        id: record.id,
        characterId: record.characterId,
        data: record.data,
        source: record.source,
        metadata: record.metadata
      });

      await this.client.send(new PutItemCommand({
        TableName: this.tableName,
        Item: item
      }));

      const duration = Date.now() - startTime;
      this.logger.info('Fusion data stored successfully', {
        characterId,
        recordId: id,
        duration,
        ttl: record.ttl
      });

      return record;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to store fusion data', error, {
        characterId,
        recordId: id,
        duration,
        tableName: this.tableName
      });
      throw error;
    }
  }

  /**
   * 📝 Store custom data
   */
  async storeCustomData(
    data: any,
    requestId: string,
    userAgent?: string,
    ip?: string
  ): Promise<CustomDataRecord> {
    const startTime = Date.now();
    const timestamp = Date.now();
    const id = uuidv4();

    const record: CustomDataRecord = {
      id,
      data,
      timestamp,
      source: 'custom',
      metadata: {
        requestId,
        userAgent,
        ip
      }
    };

    try {
      const item = marshall({
        [DB_CONFIG.MAIN_TABLE.PK]: `${DB_CONFIG.ENTITIES.CUSTOM_DATA}#${id}`,
        [DB_CONFIG.MAIN_TABLE.SK]: `CUSTOM#${timestamp}#${id}`,
        [DB_CONFIG.MAIN_TABLE.TIMESTAMP]: timestamp,
        id: record.id,
        data: record.data,
        source: record.source,
        metadata: record.metadata
      });

      await this.client.send(new PutItemCommand({
        TableName: this.tableName,
        Item: item
      }));

      const duration = Date.now() - startTime;
      this.logger.info('Custom data stored successfully', {
        recordId: id,
        duration,
        dataSize: JSON.stringify(data).length
      });

      return record;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to store custom data', error, {
        recordId: id,
        duration,
        tableName: this.tableName
      });
      throw error;
    }
  }

  /**
   * 📚 Get history with pagination and filtering
   */
  async getHistory(options: HistoryQueryOptions = {}): Promise<PaginatedResult<FusionDataRecord | CustomDataRecord>> {
    const startTime = Date.now();
    const {
      limit = 10,
      lastEvaluatedKey,
      source = 'all',
      startTime: queryStartTime,
      endTime: queryEndTime
    } = options;

    try {
      let queryParams: any = {
        TableName: this.tableName,
        IndexName: DB_CONFIG.INDEXES.TIMESTAMP_INDEX,
        Limit: limit,
        ScanIndexForward: false, // Descending order (newest first)
      };

      // For filtered queries, use Scan with FilterExpression since PKs have different patterns
      if (source === 'fusion') {
        queryParams = {
          TableName: this.tableName,
          Limit: limit,
          FilterExpression: 'begins_with(#pk, :fusioned)',
          ExpressionAttributeNames: {
            '#pk': DB_CONFIG.MAIN_TABLE.PK
          },
          ExpressionAttributeValues: marshall({
            ':fusioned': `${DB_CONFIG.ENTITIES.FUSIONED_DATA}#`
          })
        };
      } else if (source === 'custom') {
        queryParams = {
          TableName: this.tableName,
          Limit: limit,
          FilterExpression: 'begins_with(#pk, :custom)',
          ExpressionAttributeNames: {
            '#pk': DB_CONFIG.MAIN_TABLE.PK
          },
          ExpressionAttributeValues: marshall({
            ':custom': `${DB_CONFIG.ENTITIES.CUSTOM_DATA}#`
          })
        };
      } else {
        // For 'all', we need to use Scan instead of Query
        queryParams = {
          TableName: this.tableName,
          Limit: limit,
          FilterExpression: 'begins_with(#pk, :fusioned) OR begins_with(#pk, :custom)',
          ExpressionAttributeNames: {
            '#pk': DB_CONFIG.MAIN_TABLE.PK
          },
          ExpressionAttributeValues: marshall({
            ':fusioned': `${DB_CONFIG.ENTITIES.FUSIONED_DATA}#`,
            ':custom': `${DB_CONFIG.ENTITIES.CUSTOM_DATA}#`
          })
        };
      }

      // Add time range filtering
      if (queryStartTime || queryEndTime) {
        const timeFilter: string[] = [];
        const timeValues: any = { ...queryParams.ExpressionAttributeValues };

        if (queryStartTime) {
          timeFilter.push(`#timestamp >= :startTime`);
          Object.assign(timeValues, marshall({ ':startTime': queryStartTime }));
        }

        if (queryEndTime) {
          timeFilter.push(`#timestamp <= :endTime`);
          Object.assign(timeValues, marshall({ ':endTime': queryEndTime }));
        }

        if (timeFilter.length > 0) {
          const existingFilter = queryParams.FilterExpression || '';
          queryParams.FilterExpression = existingFilter 
            ? `${existingFilter} AND ${timeFilter.join(' AND ')}`
            : timeFilter.join(' AND ');
          
          queryParams.ExpressionAttributeNames = {
            ...queryParams.ExpressionAttributeNames,
            '#timestamp': DB_CONFIG.MAIN_TABLE.TIMESTAMP
          };
          queryParams.ExpressionAttributeValues = timeValues;
        }
      }

      // Add pagination
      if (lastEvaluatedKey) {
        try {
          queryParams.ExclusiveStartKey = marshall(JSON.parse(lastEvaluatedKey));
        } catch (error) {
          this.logger.warn('Invalid lastEvaluatedKey format', { lastEvaluatedKey });
        }
      }

      // Always use Scan since we're using FilterExpression
      const command = new ScanCommand(queryParams);
      
      const response = await this.client.send(command);

      const items = (response.Items || []).map(item => unmarshall(item)) as (FusionDataRecord | CustomDataRecord)[];
      
      const result: PaginatedResult<FusionDataRecord | CustomDataRecord> = {
        items,
        count: response.Count || 0,
        scannedCount: response.ScannedCount
      };

      if (response.LastEvaluatedKey) {
        result.lastEvaluatedKey = JSON.stringify(unmarshall(response.LastEvaluatedKey));
      }

      const duration = Date.now() - startTime;
      this.logger.info('History retrieved successfully', {
        source,
        count: result.count,
        scannedCount: result.scannedCount,
        duration,
        hasNextPage: !!result.lastEvaluatedKey
      });

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to retrieve history', error, {
        source,
        limit,
        duration,
        tableName: this.tableName
      });
      throw error;
    }
  }

  /**
   * 🔍 Get specific fusion record
   */
  async getFusionRecord(characterId: string, recordId: string): Promise<FusionDataRecord | null> {
    const startTime = Date.now();

    try {
      const response = await this.client.send(new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          [DB_CONFIG.MAIN_TABLE.PK]: `${DB_CONFIG.ENTITIES.FUSIONED_DATA}#${characterId}`,
          [DB_CONFIG.MAIN_TABLE.SK]: `FUSION#${recordId}`
        })
      }));

      const duration = Date.now() - startTime;

      if (!response.Item) {
        this.logger.info('Fusion record not found', { characterId, recordId, duration });
        return null;
      }

      const record = unmarshall(response.Item) as FusionDataRecord;
      this.logger.info('Fusion record retrieved', { characterId, recordId, duration });
      
      return record;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to get fusion record', error, {
        characterId,
        recordId,
        duration
      });
      throw error;
    }
  }

  /**
   * 🗑️ Clean expired records (utility method)
   */
  async cleanExpiredRecords(): Promise<number> {
    const startTime = Date.now();
    let deletedCount = 0;

    try {
      // DynamoDB TTL handles this automatically, but we can implement manual cleanup if needed
      this.logger.info('TTL cleanup - DynamoDB handles this automatically', {
        tableName: this.tableName,
        cacheTableName: this.cacheTableName
      });

      return deletedCount;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to clean expired records', error, { duration });
      throw error;
    }
  }

  /**
   * 📊 Get database statistics
   */
  async getStats(): Promise<{
    totalFusionRecords: number;
    totalCustomRecords: number;
    oldestRecord?: number;
    newestRecord?: number;
  }> {
    // Implementation would require counting records
    // For now, return placeholder stats
    return {
      totalFusionRecords: 0,
      totalCustomRecords: 0
    };
  }
}