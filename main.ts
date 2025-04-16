import { NestFactory } from '@nestjs/core';
import { WhatsAppModule } from './whatsapp.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(WhatsAppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3001);
  console.log('Microservicio WhatsApp corriendo en http://localhost:3001');
}
bootstrap();
