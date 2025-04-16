import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { ChatMessage } from '../../domain/models/chat-message.model';
import { OpenAiPort } from '../../domain/ports/openai.port';

@Injectable()
export class OpenAiClientAdapter implements OpenAiPort {
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('❌ Falta la clave OPENAI_API_KEY en el .env');
    }

    this.openai = new OpenAI({ apiKey });
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL'),
      messages,
      temperature: 0.7,
    });

    return (
      response.choices[0].message.content ?? 'Lo siento, no pude responder.'
    );
  }
}
