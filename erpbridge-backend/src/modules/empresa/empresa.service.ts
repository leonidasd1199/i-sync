import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from './empresa.entity';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
  ) {}

  /**
   * Fetch all companies from the database.
   * If no records are found, return a default demo company.
   */
  async findAll(): Promise<Empresa[]> {
    const empresas = await this.empresaRepo.find();

    // If database is empty, push the demo company as fallback
    if (empresas.length === 0) {
      const demo = new Empresa();
      demo.idEmpresa = '0'; 
      demo.nombre = 'EMPRESA MODELO';
      demo.direccion = '';
      demo.email = '';
      empresas.push(demo);
    }

    return empresas;
  }

  /**
   * Fetch a single company by its ID.
   * Returns null if no match is found.
   */
  async findById(id: string): Promise<Empresa | null> {
    return this.empresaRepo.findOne({ where: { idEmpresa: id } });
  }
}
