import { Controller, Get } from '@nestjs/common';
import { RedisCacheAdapter } from '../../infrastructure/adapters/redis-cache.adapter';

/** Para realizar test a redis **/
@Controller('test')
export class TestController {
  constructor(private readonly cache: RedisCacheAdapter) {}

  @Get('redis')
  async testRedis(): Promise<string> {
    await this.cache.testWriteRead();
    return '✅ Redis test ejecutado. Ver consola para verificación.';
  }
}
