import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('cliempre')
export class Cliempre {
  @PrimaryColumn({ name: 'codigo', type: 'varchar', length: 20 })
  codigo: string;

  @Column({ name: 'id_empresa', type: 'varchar', length: 6, nullable: false })
  idEmpresa: string;

  @Column({ name: 'agencia', type: 'varchar', length: 3, nullable: false })
  agencia: string;

  @Column({ name: 'nombre', type: 'char', length: 100, nullable: false })
  nombre: string;

  @Column({ name: 'cedula', type: 'varchar', length: 20, nullable: false })
  cedula: string;

  @Column({ name: 'email', type: 'varchar', length: 1024, nullable: true })
  email?: string;

  @Column({ name: 'direccion', type: 'varchar', length: 200, nullable: true })
  direccion?: string;

  @Column({ name: 'telefonos', type: 'varchar', length: 150, nullable: true })
  telefonos?: string;

  @Column({ name: 'sector', type: 'varchar', length: 6, nullable: true })
  sector?: string;

  @Column({ name: 'tipo', type: 'char', length: 6, nullable: true })
  tipo?: string;

  @Column({ name: 'referenc1', type: 'varchar', length: 150, nullable: true })
  referenc1?: string;

    @Column({ name: 'wwwcli', type: 'varchar', length: 150, nullable: true })
  wwwcli?: string;
}
