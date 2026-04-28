import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { PedidosScheduler } from './pedidos.scheduler';
import { CarritoModule } from '../carrito/carrito.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), CarritoModule],
  controllers: [PedidosController],
  providers: [PedidosService, PedidosScheduler],
  exports: [PedidosService],
})
export class PedidosModule {}