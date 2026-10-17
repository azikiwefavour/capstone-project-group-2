import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Suppress default Nest logger during bootstrap — Winston takes over after init
    bufferLogs: true,
  });

  // Hand all NestJS internal logs over to Winston (saves them to file too)
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Global prefix
  app.setGlobalPrefix('api');

  // Redirect root '/' to Swagger docs so visitors don't see 'Cannot GET /'
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (_req: any, res: any) => {
    res.redirect('/api/docs');
  });

  // CORS – allow frontend dev servers and production Render URLs
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, '');
  app.enableCors({
    origin: (origin: any, callback: any) => {
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('onrender.com') ||
        (frontendUrl && origin === frontendUrl)
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('MedTrail API')
    .setDescription(
      'One medication record, from prescription to patient.\n\n' +
        '## Authentication Flow\n' +
        '1. **Register** – `POST /api/auth/register`\n' +
        '2. **Verify Email OTP** – `POST /api/auth/verify-email`\n' +
        '3. **Select Role & Login** – `POST /api/auth/login`\n' +
        '4. **Forgot Password** – `POST /api/auth/forgot-password`\n' +
        '5. **Verify Reset Code** – `POST /api/auth/verify-reset-code`\n' +
        '6. **Reset Password** – `POST /api/auth/reset-password`\n\n' +
        'Use the 🔒 Authorize button with `Bearer <token>` for protected routes.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Auth', 'Registration, login, OTP & password reset')
    .addTag('Users', 'User profile management')
    .addTag('Admin', 'Admin-only operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`🚀 MedTrail API running at http://localhost:${port}/api`, 'Bootstrap');
  logger.log(`📚 Swagger docs at   http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
