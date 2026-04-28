import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agencias } from './agencias.entity';
import { AgenciasService } from './agencias.service';
import { AgenciasController } from './agencias.controller';


@Module({
  imports: [TypeOrmModule.forFeature([Agencias])],
  controllers: [AgenciasController],
  providers: [AgenciasService],
  exports: [AgenciasService],
})
export class AgenciasModule {}
