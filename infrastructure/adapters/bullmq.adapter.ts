import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { QueuePort } from '../../domain/ports/queue.port';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BullMqAdapter implements QueuePort {
  private queue: Queue;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error(
        '❌ REDIS_URL no está definido en el archivo .env. Asegúrate de configurarlo correctamente.',
      );
    }

    this.queue = new Queue('whatsapp-messages', {
      connection: {
        url: redisUrl,
      },
    });
  }

  async enqueue<T>(jobName: string, data: T): Promise<void> {
    console.log(`📤 Encolando job: ${jobName}`, data);
    await this.queue.add(jobName, data);
  }
}
