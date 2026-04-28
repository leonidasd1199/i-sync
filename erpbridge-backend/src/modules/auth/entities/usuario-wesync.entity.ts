import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Represents the PSKLOUD "usuarios_wesync" table.
 * Passwords are stored with bcrypt hashes (PHP-style: $2y$...).
 */
@Entity({ name: 'usuarios_wesync' })
export class UsuarioWesync {
  @PrimaryColumn({ name: 'username', type: 'varchar', length: 30 })
  username: string;

  @Column({ name: 'password', type: 'text' })
  password: string;

  @Column({ name: 'estacion', type: 'varchar', length: 3, nullable: true })
  estacion?: string;

  @Column({ name: 'descargapdf', type: 'int', unsigned: true, default: 0, nullable: true })
  descargapdf?: number;

  @Column({ name: 'formatoweb', type: 'int', unsigned: true, default: 0, nullable: true })
  formatoweb?: number;

  @Column({ name: 'existenciadetallada', type: 'int', unsigned: true, default: 0, nullable: true })
  existenciadetallada?: number;
}
