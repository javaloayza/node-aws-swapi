/**
 * 🗄️ Cache Service - DynamoDB TTL Cache
 * - 30-minute cache for fusion data
 * - Automatic TTL cleanup
 * - Performance optimization
 */

import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '../utils/logger';
import { CONFIG, CACHE_CONFIG } from '../utils/constants';

export class CacheService {
  private readonly client: DynamoDBClient;
  private readonly tableName: string;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.client = new DynamoDBClient({ region: CONFIG.region });
    this.tableName = CONFIG.cacheTable;
    this.logger = logger;
  }

  /**
   * 💾 Set cache with TTL
   */
  async set(key: string, data: any, ttlSeconds = CACHE_CONFIG.TTL.FUSIONED_DATA): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;
    
    try {
      await this.client.send(new PutItemCommand({
        TableName: this.tableName,
        Item: marshall({
          cacheKey: key,
          value: data,
          ttl,
          createdAt: Date.now()
        })
      }));
      
      this.logger.info('Cache set successfully', { key, ttl });
    } catch (error: any) {
      this.logger.error('Failed to set cache', error, { key });
    }
  }

  /**
   * 📖 Get from cache
   */
  async get(key: string): Promise<any | null> {
    try {
      const response = await this.client.send(new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ cacheKey: key })
      }));

      if (!response.Item) {
        this.logger.info('Cache miss', { key });
        return null;
      }

      const item = unmarshall(response.Item);
      this.logger.info('Cache hit', { key });
      return item.value;
      
    } catch (error: any) {
      this.logger.error('Failed to get cache', error, { key });
      return null;
    }
  }

  /**
   * 🔑 Generate cache key for fusion data
   */
  static fusionKey(characterId: string): string {
    return CACHE_CONFIG.KEYS.FUSIONED(characterId);
  }
}