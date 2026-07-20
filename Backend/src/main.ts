import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { isLiteMode } from './config/lite';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  if (isLiteMode()) {
    app.enableCors({ origin: true, credentials: true });
  } else {
    const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    app.enableCors({
      origin: frontendUrl.split(',').map((o) => o.trim()),
      credentials: true,
    });
  }

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
