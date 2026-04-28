import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import { existsSync } from "fs";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configSvc = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix("api");

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const isProd = configSvc.get<string>('NODE_ENV') === 'production';
  app.enableCors({
    origin: isProd
      ? ['https://app.isync.site']
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'Access-Control-Allow-Headers',
    ],
  });

  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("ERPBridge API")
      .setDescription("Backend for the ERPBridge panel (NestJS + TypeORM)")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  const imagePaths = (process.env.IMAGES_PATHS || "").split(",").map((p) => p.trim());
  logger.log(`IMAGES_PATHS = ${process.env.IMAGES_PATHS}`);

  for (const dir of imagePaths) {
    if (existsSync(dir)) {
      app.use("/images", express.static(dir));
      logger.log(`Serving images from: ${dir}`);
    } else {
      logger.warn(`Image directory not found: ${dir}`);
    }
  }

  const publicPath = path.join(process.cwd(), "public");
  if (existsSync(publicPath)) {
    app.use("/images", express.static(publicPath));
    logger.log(`Fallback image path: ${publicPath}`);
  } else {
    logger.warn(`Public folder not found: ${publicPath}`);
  }

  const port = parseInt(configSvc.get<string>("PORT") || "3001", 10);
  await app.listen(port);

  logger.log(`ERPBridge API running at http://localhost:${port}`);
  if (!isProd) logger.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
