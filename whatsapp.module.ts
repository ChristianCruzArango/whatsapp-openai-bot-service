import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

import { WhatsAppController } from './presentation/controllers/whatsapp.controller';
import { WhatsAppService } from './application/services/whatsApp.service';
import { WhatsAppSessionManager } from './infrastructure/clients/session-manager';
import { WhatsappJwtStrategy } from './infrastructure/strategies/jwt.strategy';

import * as redisStore from 'cache-manager-ioredis';

import { RedisCacheAdapter } from './infrastructure/adapters/redis-cache.adapter';
import { CACHE_PORT } from './domain/tokens/cache.token';
import { SESSION_REPOSITORY } from './domain/tokens/session-repository.token';
import { WhatsAppSessionRepository } from './infrastructure/repositories/whatsapp-session.repository';
import { QUEUE_PORT } from './domain/tokens/queue.token';
import { BullMqAdapter } from './infrastructure/adapters/bullmq.adapter';
import { QueueHandlerService } from './application/services/queue-handler.service';
import { ProcessIncomingMessageJob } from './application/jobs/process-incoming-message.job';
import { CHAT_MEMORY_PORT } from './domain/tokens/chat-memory.token';
import { RedisChatMemoryAdapter } from './infrastructure/adapters/redis-chat-memory.adapter';

import { OPENAI_PORT } from './domain/tokens/openai.token';
import { OpenAiClientAdapter } from './infrastructure/adapters/openai-client.adapter';
import { TestController } from './presentation/controllers/test.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        url: configService.get<string>('REDIS_URL'),
        tls: true,
        ttl: 0,
        prefix: '',
      }),
    }),
  ],
  controllers: [WhatsAppController, TestController],
  providers: [
    WhatsAppService,
    WhatsAppSessionManager,
    WhatsappJwtStrategy,
    QueueHandlerService,
    ProcessIncomingMessageJob,
    RedisCacheAdapter,

    // Adaptador de cache (Redis)
    {
      provide: CACHE_PORT,
      useClass: RedisCacheAdapter,
    },

    // Repositorio de sesión
    {
      provide: SESSION_REPOSITORY,
      useClass: WhatsAppSessionRepository,
    },

    // Adaptador de bullmq
    {
      provide: QUEUE_PORT,
      useClass: BullMqAdapter,
    },

    //Chat Memoria
    {
      provide: CHAT_MEMORY_PORT,
      useClass: RedisChatMemoryAdapter,
    },

    //IA
    {
      provide: OPENAI_PORT,
      useClass: OpenAiClientAdapter,
    },
  ],
})
export class WhatsAppModule {}
