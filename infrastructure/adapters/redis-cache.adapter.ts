import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CachePort } from '../../domain/ports/cache.port';

@Injectable()
export class RedisCacheAdapter implements CachePort {
  private readonly logger = new Logger(RedisCacheAdapter.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.cacheManager.set(key, serialized, ttl);
    } catch (error) {
      this.logger.error(`Error setting key "${key}" in Redis`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.cacheManager.get<string>(key);
      if (!raw) return undefined;

      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.error(`Error getting key "${key}" from Redis`, error);
      return undefined;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del?.(key);
    } catch (error) {
      this.logger.error(`Error deleting key "${key}" from Redis`, error);
    }
  }

  async testWriteRead() {
    const key = 'chat-history:test';
    const value = JSON.stringify([{ role: 'user', content: 'hola' }]);

    await this.cacheManager.set(key, value, 3600);
    const read = await this.cacheManager.get<string>(key);
    console.log('🔎 Valor leído desde Redis test:', read);
  }
}
