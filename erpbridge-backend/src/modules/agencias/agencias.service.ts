import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agencias } from './agencias.entity';

@Injectable()
export class AgenciasService {
  constructor(
    @InjectRepository(Agencias)
    private readonly agenciasRepo: Repository<Agencias>,
  ) {}


  async findAll(): Promise<Pick<Agencias, 'agencia' | 'nombre'>[]> {
    return this.agenciasRepo.find({
      select: ['agencia', 'nombre'],
      order: { nombre: 'ASC' },
    });
  }

async findByEmpresa(id_empresa: string): Promise<Pick<Agencias, 'agencia' | 'nombre'>[]> {
  return this.agenciasRepo.find({
    where: { idEmpresa: id_empresa }, // ✅ property:variable
    select: ['agencia', 'nombre'],
    order: { nombre: 'ASC' },
  });
}


  async findByAgencia(
    code: string,
  ): Promise<Pick<Agencias, 'agencia' | 'nombre'> | null> {
    const result = await this.agenciasRepo.findOne({
      where: { agencia: code },
      select: ['agencia', 'nombre'],
    });
    return result ?? null;
  }
}
