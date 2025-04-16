import { Inject, Injectable } from '@nestjs/common';
import { QUEUE_PORT } from '../../domain/tokens/queue.token';
import { QueuePort } from '../../domain/ports/queue.port';

@Injectable()
export class QueueHandlerService {
  constructor(@Inject(QUEUE_PORT) private readonly queue: QueuePort) {}

  async handleIncomingMessage(userUid: string, message: string, from: string) {
    await this.queue.enqueue('process-incoming-message', {
      userUid,
      from,
      message,
    });
  }
}
