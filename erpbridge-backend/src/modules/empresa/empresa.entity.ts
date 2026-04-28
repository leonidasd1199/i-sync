import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Represents the PSKLOUD "empresa" table.
 * All fields are mapped using original column names.
 * Property names follow camelCase to match TypeScript conventions.
 */
@Entity({ name: 'empresas' })
export class Empresa {
  @PrimaryColumn({ name: 'id_empresa', type: 'varchar', length: 6 })
  idEmpresa: string;

  @Column({ name: 'nombre', type: 'varchar', length: 80, nullable: true })
  nombre?: string;

  @Column({ name: 'direccion', type: 'varchar', length: 254, nullable: true })
  direccion?: string;

  @Column({ name: 'telefonos', type: 'varchar', length: 120, nullable: true })
  telefonos?: string;

  @Column({ name: 'fax', type: 'varchar', length: 120, nullable: true })
  fax?: string;

  @Column({ name: 'numerorif', type: 'varchar', length: 20, nullable: true })
  numeroRif?: string;

  @Column({ name: 'numeronit', type: 'varchar', length: 20, nullable: true })
  numeroNit?: string;

  @Column({ name: 'website', type: 'varchar', length: 120, nullable: true })
  website?: string;

  @Column({ name: 'email', type: 'varchar', length: 200, nullable: true })
  email?: string;

  @Column({ name: 'contacto', type: 'varchar', length: 60, nullable: true })
  contacto?: string;

  @Column({ name: 'predeter', type: 'double', precision: 4, scale: 0, default: 0 })
  predeter: number;

  @Column({ name: 'soporte1', type: 'varchar', length: 60, nullable: true })
  soporte1?: string;

  @Column({ name: 'soporte2', type: 'varchar', length: 60, nullable: true })
  soporte2?: string;

  @Column({ name: 'soporte3', type: 'varchar', length: 60, nullable: true })
  soporte3?: string;

  @Column({ name: 'data_usaweb', type: 'double', precision: 4, scale: 0, default: 0 })
  dataUsaWeb: number;

  @Column({ name: 'data_servidor', type: 'varchar', length: 100, nullable: true })
  dataServidor?: string;

  @Column({ name: 'data_usuario', type: 'varchar', length: 30, nullable: true })
  dataUsuario?: string;

  @Column({ name: 'data_password', type: 'varchar', length: 30, nullable: true })
  dataPassword?: string;

  @Column({ name: 'data_port', type: 'varchar', length: 4, default: '3306' })
  dataPort: string;

  @Column({ name: 'licencia', type: 'varchar', length: 20, nullable: true })
  licencia?: string;

  @Column({ name: 'historizada', type: 'tinyint', width: 2, default: 0 })
  historizada: number;

  @Column({ name: 'masinfo', type: 'text', nullable: true })
  masInfo?: string;

  @Column({ name: 'usa_prefijo', type: 'double', precision: 4, scale: 0, default: 0 })
  usaPrefijo: number;

  @Column({ name: 'name_prefijo', type: 'varchar', length: 30 })
  namePrefijo: string;

  @Column({ name: 'dprefijobd', type: 'double', precision: 4, scale: 0, default: 0 })
  dPrefijoBd: number;

  @Column({ name: 'dprefijosrv', type: 'double', precision: 4, scale: 0, default: 0 })
  dPrefijoSrv: number;

  @Column({ name: 'dprefijousr', type: 'double', precision: 4, scale: 0, default: 0 })
  dPrefijoUsr: number;
}
