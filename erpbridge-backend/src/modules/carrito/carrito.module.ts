import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CarritoController } from './carrito.controller';
import { CarritoService } from './carrito.service';
import { CarritoScheduler } from './carrito.scheduler';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CarritoController],
  providers: [CarritoService, CarritoScheduler],
  exports: [CarritoService],
})
export class CarritoModule {}
