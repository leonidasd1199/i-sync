import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Articulo } from './articulo.entity';

@Entity('existenc')
export class Existencia {
  @PrimaryColumn({ name: 'codigo', type: 'varchar', length: 25 })
  codigo: string;

  @PrimaryColumn({ name: 'id_empresa', type: 'varchar', length: 6 })
  idEmpresa: string;

  @PrimaryColumn({ name: 'agencia', type: 'varchar', length: 3 })
  agencia: string;

  @Column({ name: 'almacen', type: 'varchar', length: 2 })
  almacen: string;

  @Column({ name: 'existencia', type: 'double', default: 0 })
  existencia: number;

  @ManyToOne(() => Articulo, (articulo) => articulo.existencias)
  @JoinColumn({ name: 'codigo', referencedColumnName: 'codigo' })
  articulo: Articulo;
}
