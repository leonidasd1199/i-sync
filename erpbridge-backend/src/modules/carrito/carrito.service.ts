import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CREATE_CART_RELACION_TABLE_SQL, CREATE_CART_VERSION_TABLE_SQL } from './carrito.entity.sql';

const ALMACEN_ACTIVO = '1';

@Injectable()
export class CarritoService {
  private readonly logger = new Logger(CarritoService.name);

  constructor(private ds: DataSource) {}

  async ensureTable() {
    await this.ds.query(CREATE_CART_RELACION_TABLE_SQL);
    await this.ds.query(CREATE_CART_VERSION_TABLE_SQL);
  }

  async getVersion(cliente: string): Promise<{ version: number }> {
    await this.ensureTable();
    const [row] = await this.ds.query(
      `SELECT version FROM carrito_version WHERE cliente_codigo = ?`,
      [cliente],
    );
    return { version: Number(row?.version ?? 0) };
  }

  private async bumpVersion(cliente: string): Promise<number> {
    const version = Date.now();
    await this.ds.query(
      `INSERT INTO carrito_version (cliente_codigo, version)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE version = VALUES(version)`,
      [cliente, version],
    );
    return version;
  }

  async getUserCart(cliente: string, idEmpresa = '001000', agencia = '001') {
    await this.ensureTable();

    const [clienteData] = await this.ds.query(
      `SELECT precio AS tipoPrecio, formafis
       FROM admin001000.cliempre
       WHERE codigo = ? AND id_empresa = ? AND agencia = ?
       LIMIT 1`,
      [cliente, idEmpresa, agencia],
    );

    const tipoPrecio = Number(clienteData?.tipoPrecio ?? 1);
    const formafiscal = Number(clienteData?.formafis ?? 0);
    const campoPrecioBase = `a.precio${tipoPrecio}`;
    const campoPrecioFinal = `a.preciofin${tipoPrecio}`;

    // one query: cart items + live product data + stock
    const rows = await this.ds.query(
      `
      SELECT
        r.codigo_articulo                 AS codigo,
        r.cantidad,
        a.nombre,
        ${campoPrecioBase}               AS precioBase,
        ${campoPrecioFinal}              AS precioFinal,
        a.impuesto1,
        a.rutafoto,
        COALESCE(SUM(e.existencia), 0)   AS stockFisico
      FROM carrito_relacion r
      LEFT JOIN admin001000.articulo a
             ON a.codigo     = r.codigo_articulo
            AND a.id_empresa = ?
      LEFT JOIN admin001000.existenc e
             ON e.codigo     = r.codigo_articulo
            AND e.id_empresa = ?
            AND e.agencia    = ?
            AND e.almacen    = '${ALMACEN_ACTIVO}'
      WHERE r.cliente_codigo = ?
      GROUP BY r.codigo_articulo, r.cantidad, a.nombre,
               ${campoPrecioBase}, ${campoPrecioFinal}, a.impuesto1, a.rutafoto
      `,
      [idEmpresa, idEmpresa, agencia, cliente],
    );

    const [versionRow] = await this.ds.query(
      `SELECT version FROM carrito_version WHERE cliente_codigo = ?`,
      [cliente],
    );
    const version = Number(versionRow?.version ?? 0);

    const items = rows.map((row: any) => {
      let precioBase = Number(row.precioBase ?? 0);
      let precioFinal = Number(row.precioFinal ?? 0);
      const impuesto = Number(row.impuesto1 ?? 0);

      if (formafiscal === 3 && impuesto > 0) {
        const factor = 1 + impuesto / 100;
        precioBase = +(precioBase / factor).toFixed(2);
        precioFinal = +(precioFinal / factor).toFixed(2);
      }

      return {
        codigo: row.codigo,
        nombre: row.nombre,
        precioBase,
        precioFinal,
        impuesto1: impuesto,
        stock: Number(row.stockFisico ?? 0),
        formafiscal,
        imagen: this.mapRutaImagen(row.rutafoto),
        cantidad: Number(row.cantidad),
      };
    });

    this.logger.log(`Cart loaded for ${cliente}: ${items.length} items`);
    return { items, version };
  }

  async addOrUpdateItem(cliente: string, codigo: string, cantidad: number) {
    await this.ensureTable();


    await this.ds.query(
      `INSERT INTO carrito_relacion (cliente_codigo, codigo_articulo, cantidad)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)`,
      [cliente, codigo, cantidad],
    );

    const version = await this.bumpVersion(cliente);
    return { success: true, version };
  }

  async removeItem(cliente: string, codigo: string) {
    await this.ensureTable();


    await this.ds.query(
      `DELETE FROM carrito_relacion WHERE cliente_codigo = ? AND codigo_articulo = ?`,
      [cliente, codigo],
    );

    const version = await this.bumpVersion(cliente);
    return { success: true, version };
  }

  async clear(cliente: string) {
    await this.ensureTable();


    await this.ds.query(
      `DELETE FROM carrito_relacion WHERE cliente_codigo = ?`,
      [cliente],
    );

    const version = await this.bumpVersion(cliente);
    return { success: true, version };
  }

  private mapRutaImagen(ruta: string): string {
    const baseUrl = process.env.IMAGES_BASE_URL || 'http://localhost:3001/images';
    if (!ruta || ruta.trim() === '') return `${baseUrl}/carrito.png`;

    let normalized = ruta.trim().replace(/\\/g, '/');

    const stripPrefix = process.env.IMAGES_STRIP_PREFIX;
    if (stripPrefix) {
      const normStrip = stripPrefix.replace(/\\/g, '/').replace(/\/+$/, '');
      if (normalized.toLowerCase().startsWith(normStrip.toLowerCase())) {
        normalized = normalized.slice(normStrip.length).replace(/^\/+/, '');
      }
    } else {
      normalized = normalized.replace(/^[A-Za-z]:\//, '');
    }

    if (!normalized) return `${baseUrl}/carrito.png`;

    const encoded = normalized
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');

    return `${baseUrl}/${encoded}`;
  }
}