import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("clientes_login")
export class ClienteLogin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "codigo_cliente", type: "varchar", length: 20, unique: true })
  codigoCliente: string; // ✅ coincide con el campo usado en el servicio

  @Column({ name: "password_hash", type: "varchar", length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ name: "email", type: "varchar", length: 100, nullable: true })
  email: string | null; // ✅ nuevo campo para recuperación de contraseña

  @Column({ name: "first_login", type: "tinyint", width: 1, default: 1 })
  firstLogin: number;

  @Column({ name: "last_login", type: "datetime", nullable: true })
  lastLogin: Date | null;

  @CreateDateColumn({
    name: "created_at",
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;
}
