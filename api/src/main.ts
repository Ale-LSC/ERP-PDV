import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const jwtSecret = configService.getOrThrow<string>('JWT_SECRET');
  if (
    jwtSecret.length < 32 ||
    jwtSecret === 'replace-with-a-long-random-secret'
  ) {
    throw new Error(
      'JWT_SECRET deve possuir pelo menos 32 caracteres e não pode usar o valor de exemplo',
    );
  }
  const corsOrigins = (
    configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim());

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: false,
  });
  app.enableShutdownHooks();

  await app.listen(configService.get<number>('PORT') ?? 3000);
}
void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
