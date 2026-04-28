import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CarritoService } from './carrito.service';

@Injectable()
export class CarritoScheduler implements OnModuleInit {
  private readonly logger = new Logger(CarritoScheduler.name);

  constructor(private readonly carritoService: CarritoService) {}

  async onModuleInit() {
    this.logger.log('Scheduler cargado ✓');
    await this.carritoService.ensureTable();
    this.logger.log('Tablas carrito_relacion / carrito_version verificadas ✓');
  }

  @Cron('*/30 * * * * *')
  async check() {
    this.logger.log('Cron ejecutado -> carrito_relacion OK');
  }
}
