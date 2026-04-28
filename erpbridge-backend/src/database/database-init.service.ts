import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.ensureClientesLoginTable();
    await this.ensureOpermvColumns();
  }

  private async ensureClientesLoginTable() {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      this.logger.log('Verifying table `clientes_login`...');

      const exists = await queryRunner.query(`
        SELECT COUNT(*) AS count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'clientes_login';
      `);

      if (exists[0].count > 0) {
        this.logger.log('✅ Table `clientes_login` already exists.');
        return;
      }

      this.logger.warn('⚠️ Table `clientes_login` not found. Creating it...');
      await queryRunner.query(`
        CREATE TABLE clientes_login (
          id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          codigo_cliente VARCHAR(20) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NULL,
          email VARCHAR(255) NULL,
          first_login TINYINT(1) DEFAULT 1,
          last_login DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      this.logger.log('✅ Table `clientes_login` created successfully.');
    } catch (error) {
      this.logger.error('❌ Error verifying or creating `clientes_login` table:', error);
    } finally {
      await queryRunner.release();
    }
  }

  private async ensureOpermvColumns() {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      this.logger.log('Verifying columns in `admin001000.opermv`...');

      const requiredColumns = [
        { name: 'idvalidacion', definition: 'VARCHAR(50) NULL DEFAULT NULL' },
      ];

      for (const col of requiredColumns) {
        const exists = await queryRunner.query(`
          SELECT COUNT(*) AS count 
          FROM information_schema.columns 
          WHERE table_schema = 'admin001000' 
            AND table_name = 'opermv' 
            AND column_name = ?;
        `, [col.name]);

        if (exists[0].count === 0) {
          this.logger.warn(`⚠️ Column '${col.name}' not found in opermv. Adding...`);
          await queryRunner.query(`
            ALTER TABLE admin001000.opermv 
            ADD COLUMN ${col.name} ${col.definition};
          `);
          this.logger.log(`✅ Column '${col.name}' added to opermv.`);
        } else {
          this.logger.log(`✅ Column '${col.name}' already exists in opermv.`);
        }
      }

      await this.ensureOpertiColumns(queryRunner);

    } catch (error) {
      this.logger.error('❌ Error verifying opermv columns:', error);
    } finally {
      await queryRunner.release();
    }
  }

  private async ensureOpertiColumns(queryRunner: any) {
    this.logger.log('Verifying columns in `admin001000.operti`...');

    const requiredColumns = [
      { name: 'idvalidacion', definition: 'VARCHAR(50) NULL DEFAULT NULL' },
    ];

    for (const col of requiredColumns) {
      const exists = await queryRunner.query(`
        SELECT COUNT(*) AS count 
        FROM information_schema.columns 
        WHERE table_schema = 'admin001000' 
          AND table_name = 'operti' 
          AND column_name = ?;
      `, [col.name]);

      if (exists[0].count === 0) {
        this.logger.warn(`⚠️ Column '${col.name}' not found in operti. Adding...`);
        await queryRunner.query(`
          ALTER TABLE admin001000.operti 
          ADD COLUMN ${col.name} ${col.definition};
        `);
        this.logger.log(`✅ Column '${col.name}' added to operti.`);
      } else {
        this.logger.log(`✅ Column '${col.name}' already exists in operti.`);
      }
    }
  }
}