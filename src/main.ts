import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './modules/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = ['http://localhost:5173'];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-language',
      'x-client-type',
      'x-refresh-token',
    ],
    exposedHeaders: [
      'x-access-token',
      'x-refresh-token',
      'x-access-token-expiry',
      'x-refresh-token-expiry',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
    }),
  );

  const configService = app.get(ConfigService);
  const PORT = configService.getOrThrow<string>('PORT');
  const NODE_ENV = configService.getOrThrow<string>('NODE_ENV');

  await app.listen(PORT);

  console.log(
    `🚀 Backend server is running on: http://localhost:${PORT}, environment: ${NODE_ENV}`,
  );
}
bootstrap();
