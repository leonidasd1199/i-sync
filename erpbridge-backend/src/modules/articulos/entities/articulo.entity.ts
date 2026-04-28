import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Existencia } from './existencia.entity';

@Entity('articulo')
export class Articulo {
  @PrimaryColumn({ name: 'codigo', type: 'varchar', length: 25 })
  codigo: string;

  @Column({ name: 'id_empresa', type: 'varchar', length: 6 })
  idEmpresa: string;

  @Column({ name: 'agencia', type: 'varchar', length: 3 })
  agencia: string;

  @Column({ name: 'nombre', type: 'char', length: 150 })
  nombre: string;

  @Column({ name: 'preciofin1', type: 'double', default: 0 })
  precioFin1: number;

  @Column({ name: 'impuesto1', type: 'double', default: 0 })
  impuesto1: number;

  @Column({ name: 'aceptadscto', type: 'double', default: 0 })
  aceptaDscto: number;

  @Column({ name: 'nousaweb', type: 'double', default: 0 })
  noUsaWeb: number;

  @Column({ name: 'grupo', type: 'int', nullable: true })
  grupo: number;

  @Column({ name: 'subgrupo', type: 'int', nullable: true })
  subgrupo: number;

  @Column({ name: 'marca', type: 'varchar', length: 50, nullable: true })
  marca: string;

  @Column({ name: 'modelo', type: 'varchar', length: 50, nullable: true })
  modelo: string;

  @Column({ name: 'detalles', type: 'longtext', nullable: true })
  detalles: string;

  @Column({ name: 'contraindi', type: 'longtext', nullable: true })
  contraindi: string;

  @Column({ name: 'rutafoto', type: 'varchar', length: 255, nullable: true })
  rutafoto: string;

  @OneToMany(() => Existencia, (existencia) => existencia.articulo)
  existencias: Existencia[];
}
