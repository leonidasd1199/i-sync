import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PedidosService } from './pedidos.service';

@Injectable()
export class PedidosScheduler {
  constructor(private readonly pedidosService: PedidosService) {}

  @Cron('*/10 * * * *')
  async reprocesar() {
    await this.pedidosService.procesarPendientes();
  }
}
