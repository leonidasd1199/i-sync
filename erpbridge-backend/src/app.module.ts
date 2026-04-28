import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import * as redisStore from 'cache-manager-ioredis';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppConfigModule } from './config/config.module';
import { HealthModule } from './modules/health/health.module';
import { EmpresaModule } from './modules/empresa/empresa.module';
import { AgenciasModule } from './modules/agencias/agencias.module';
import { ArticulosModule } from './modules/articulos/articulo.module';
import { AuthModule } from './modules/auth/auth.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { ImagesModule } from './modules/images/images.module';
import { CarritoModule } from './modules/carrito/carrito.module';

import { DatabaseInitService } from './database/database-init.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    AppConfigModule,

    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore as any,
        redisInstance: {
          host: config.get<string>('REDIS_HOST') || '127.0.0.1',
          port: parseInt(config.get<string>('REDIS_PORT') || '6379', 10),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
        ttl: 0,
      }),
      isGlobal: true,
    }),

    ScheduleModule.forRoot(),

    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'mysql',
          host: config.get<string>('DB_HOST'),
          port: parseInt(config.get<string>('DB_PORT') || '3310', 10),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: false,
          charset: 'utf8mb4',
          timezone: 'Z',
          logging: isProd ? ['error'] : ['error', 'warn', 'query'],
        };
      },
    }),

    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          },
          tls:
            config.get<string>('NODE_ENV') === 'development'
              ? { rejectUnauthorized: false }
              : undefined,
        },
        defaults: {
          from: `"iSync noreply" <${config.get<string>('SMTP_USER')}>`,
        },
        template: {
          dir: join(__dirname, 'templates/email'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),

    HealthModule,
    AuthModule,
    EmpresaModule,
    AgenciasModule,
    ArticulosModule,
    ImagesModule,
    PedidosModule,
    CarritoModule,
  ],

  providers: [DatabaseInitService],
})
export class AppModule {}
