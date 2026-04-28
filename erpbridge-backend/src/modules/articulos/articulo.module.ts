import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Articulo } from './entities/articulo.entity';
import { Existencia } from './entities/existencia.entity';
import { ArticulosService } from './articulo.service';
import { ArticulosController } from './articulo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Articulo, Existencia])],
  controllers: [ArticulosController],
  providers: [ArticulosService],
  exports: [ArticulosService],
})
export class ArticulosModule {}
