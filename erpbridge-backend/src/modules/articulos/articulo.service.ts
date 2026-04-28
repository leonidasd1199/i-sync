import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Articulo } from "./entities/articulo.entity";
import { Existencia } from "./entities/existencia.entity";

const ALMACEN_ACTIVO = '1';

@Injectable()
export class ArticulosService {
  constructor(
    @InjectRepository(Articulo)
    private readonly articuloRepo: Repository<Articulo>,
    @InjectRepository(Existencia)
    private readonly existenciaRepo: Repository<Existencia>,
    private readonly dataSource: DataSource,
  ) {}

private getSqlComprometidos(idEmpresa: string, agencia: string): { sql: string; params: string[] } {
  return {
    sql: `
      SELECT mv.codigo, SUM(mv.cantidad) AS cant_comprometida
      FROM admin001000.opermv mv
      INNER JOIN admin001000.operti ti
        ON ti.id_empresa = mv.id_empresa
       AND ti.agencia = mv.agencia
       AND ti.tipodoc = mv.tipodoc
       AND ti.documento = mv.documento
      WHERE ti.id_empresa = ?
        AND ti.agencia = ?
        AND ti.tipodoc = 'PED'
        AND ti.seimporto = 0
        AND ti.estatusdoc = '0'
        AND mv.almacen = '${ALMACEN_ACTIVO}'
      GROUP BY mv.codigo
    `,
    params: [idEmpresa, agencia],
  };
}

  async listarArticulosPaginated(
    idEmpresa: string,
    agencia: string,
    codCliente: string,
    page = 1,
    limit = 50,
    q?: string,
    filters?: {
      grupo?: string;
      subgrupo?: string;
      stockFilter?: string;
      modelo?: string;
    },
  ) {
    const skip = (page - 1) * limit;

    const [cliente] = await this.dataSource.query(
      `SELECT precio AS tipoPrecio, formafis FROM admin001000.cliempre WHERE codigo = ? AND id_empresa = ? AND agencia = ? LIMIT 1;`,
      [codCliente, idEmpresa, agencia],
    );

    const tipoPrecio = Number(cliente?.tipoPrecio ?? 1);
    const formafiscal = Number(cliente?.formafis ?? 0);
    const campoPrecioBase = `a.precio${tipoPrecio}`;
    const campoPrecioFinal = `a.preciofin${tipoPrecio}`;

    let whereClause = `a.id_empresa = ? AND a.noUsaWeb = 0`;
    const params: any[] = [idEmpresa];

    if (q) {
      const t = `%${q}%`;
      whereClause += `
        AND (
          a.nombre LIKE ? OR a.codigo LIKE ? OR a.referencia LIKE ? OR a.marca LIKE ? OR a.modelo LIKE ?
          OR EXISTS (
            SELECT 1 FROM admin001000.invcodalternativo ca
            WHERE ca.id_empresa = a.id_empresa AND ca.agencia = ?
              AND (ca.codalternativo LIKE ? OR ca.codigo LIKE ?) AND ca.codigo = a.codigo
          )
        )
      `;
      params.push(t, t, t, t, t, agencia, t, t);
    }

    if (filters?.grupo) {
      whereClause += ` AND a.grupo = ?`;
      params.push(filters.grupo);
    }

    if (filters?.subgrupo) {
      whereClause += ` AND a.subgrupo = ?`;
      params.push(filters.subgrupo);
    }

    if (filters?.modelo) {
      whereClause += ` AND TRIM(a.modelo) = TRIM(?)`;
      params.push(filters.modelo);
    }

    const formulaStock = `(COALESCE(SUM(e.existencia), 0) - COALESCE(comp.cant_comprometida, 0))`;
    
    let havingClause = "";
    if (filters?.stockFilter === "con-stock") {
      havingClause = `HAVING ${formulaStock} > 0`;
    } else if (filters?.stockFilter === "sin-stock") {
      havingClause = `HAVING ${formulaStock} <= 0`;
    }

    const comprometidos = this.getSqlComprometidos(idEmpresa, agencia);

    const queryDatos = `
      SELECT
        a.codigo,
        a.nombre,
        a.referencia,
        ${campoPrecioBase} AS precioBase,
        ${campoPrecioFinal} AS precioFinal,
        a.impuesto1,
        a.aceptadscto AS aceptaDscto,
        a.grupo,
        a.subgrupo,
        a.marca,
        a.modelo,
        a.detalles,
        a.contraindi,
        a.rutafoto,
        ${formulaStock} AS stock
      FROM admin001000.articulo a
      LEFT JOIN admin001000.existenc e
        ON e.codigo = a.codigo
        AND e.id_empresa = a.id_empresa
        AND e.agencia = ?
        AND e.almacen = '${ALMACEN_ACTIVO}'
      LEFT JOIN (${comprometidos.sql}) comp
        ON comp.codigo = a.codigo
      WHERE ${whereClause}
      GROUP BY a.codigo
      ${havingClause}
      ORDER BY a.nombre ASC
      LIMIT ? OFFSET ?;
    `;

    let queryCount = "";
    if (havingClause) {
        queryCount = `
          SELECT COUNT(*) as total FROM (
            SELECT a.codigo
            FROM admin001000.articulo a
            LEFT JOIN admin001000.existenc e ON e.codigo = a.codigo AND e.id_empresa = a.id_empresa AND e.agencia = ? AND e.almacen = '${ALMACEN_ACTIVO}'
            LEFT JOIN (${comprometidos.sql}) comp ON comp.codigo = a.codigo
            WHERE ${whereClause}
            GROUP BY a.codigo
            ${havingClause}
          ) AS conteo
        `;
    } else {
        queryCount = `SELECT COUNT(*) AS total FROM admin001000.articulo a WHERE ${whereClause}`;
    }

    const paramsCount = havingClause ? [agencia, ...comprometidos.params, ...params] : params;

    const [rows, totalRows] = await Promise.all([
      this.dataSource.query(queryDatos, [agencia, ...comprometidos.params, ...params, limit, skip]),
      this.dataSource.query(queryCount, paramsCount),
    ]);

    const total = Number(totalRows?.[0]?.total ?? 0);

    const articulos = await Promise.all(
      rows.map(async (art: any) => {
        const alternativos = await this.dataSource.query(
          `SELECT codalternativo FROM admin001000.invcodalternativo WHERE id_empresa = ? AND agencia = ? AND codigo = ?;`,
          [idEmpresa, agencia, art.codigo],
        );

        let precioBase = Number(art.precioBase ?? 0);
        let precioFinal = Number(art.precioFinal ?? 0);
        const impuesto = Number(art.impuesto1 ?? 0);

        if (formafiscal === 3 && impuesto > 0) {
          const factor = 1 + impuesto / 100;
          precioBase = +(precioBase / factor).toFixed(2);
          precioFinal = +(precioFinal / factor).toFixed(2);
        }

        return {
          ...art,
          precioBase,
          precioFinal,
          impuesto1: impuesto,
          stock: Number(art.stock ?? 0),
          rutafoto: this.mapRutaImagen(art.rutafoto),
          codigosAlternativos: alternativos.map((a: any) => a.codalternativo),
          formafiscal,
        };
      }),
    );

    return {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: articulos,
    };
  }

  async obtenerArticuloPorCodigo(
    codigo: string,
    idEmpresa: string,
    agencia: string,
    codCliente?: string,
  ) {
    let tipoPrecio = 1;
    let formafiscal = 0;

    if (codCliente) {
      const [cliente] = await this.dataSource.query(
        `
        SELECT precio AS tipoPrecio, formafis 
        FROM admin001000.cliempre 
        WHERE codigo = ? 
          AND id_empresa = ? 
          AND agencia = ?
        LIMIT 1;
        `,
        [codCliente, idEmpresa, agencia],
      );

      tipoPrecio = Number(cliente?.tipoPrecio ?? 1);
      formafiscal = Number(cliente?.formafis ?? 0);
    }

    const campoPrecioBase = `a.precio${tipoPrecio}`;
    const campoPrecioFinal = `a.preciofin${tipoPrecio}`;
    const comprometidos = this.getSqlComprometidos(idEmpresa, agencia);

    const [row] = await this.dataSource.query(
      `
      SELECT
        a.codigo,
        a.nombre,
        a.referencia,
        ${campoPrecioBase} AS precioBase,
        ${campoPrecioFinal} AS precioFinal,
        a.impuesto1,
        a.aceptadscto AS aceptaDscto,
        a.grupo,
        a.subgrupo,
        a.marca,
        a.modelo,
        a.detalles,
        a.contraindi,
        a.rutafoto,
        (
          COALESCE((
            SELECT SUM(e.existencia)
            FROM admin001000.existenc e
            WHERE e.codigo = a.codigo
              AND e.id_empresa = a.id_empresa
              AND e.agencia = ?
              AND e.almacen = '${ALMACEN_ACTIVO}'
          ), 0)
          -
          COALESCE(comp.cant_comprometida, 0)
        ) AS stock
      FROM admin001000.articulo a
      LEFT JOIN (${comprometidos.sql}) comp ON comp.codigo = a.codigo
      WHERE a.codigo = ? AND a.id_empresa = ?
      LIMIT 1;
      `,
      [agencia, ...comprometidos.params, codigo, idEmpresa],
    );

    if (!row) return null;

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
      referencia: row.referencia,
      precioBase,
      precioFinal,
      impuesto1: impuesto,
      stock: Number(row.stock ?? 0),
      formafiscal,
      rutafoto: this.mapRutaImagen(row.rutafoto),
    };
  }

  async obtenerTotalesArticulos(idEmpresa: string, agencia: string) {
    const comprometidos = this.getSqlComprometidos(idEmpresa, agencia);

    const [row] = await this.dataSource.query(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN (COALESCE(e_sum.total_fisico, 0) - COALESCE(comp.cant_comprometida, 0)) > 0 THEN 1 ELSE 0 END) AS conStock,
        SUM(CASE WHEN (COALESCE(e_sum.total_fisico, 0) - COALESCE(comp.cant_comprometida, 0)) <= 0 THEN 1 ELSE 0 END) AS sinStock
      FROM admin001000.articulo a
      LEFT JOIN (
         SELECT codigo, SUM(existencia) as total_fisico
         FROM admin001000.existenc
         WHERE id_empresa = ? AND agencia = ? AND almacen = '${ALMACEN_ACTIVO}'
         GROUP BY codigo
      ) e_sum ON e_sum.codigo = a.codigo
      LEFT JOIN (${comprometidos.sql}) comp ON comp.codigo = a.codigo
      WHERE a.id_empresa = ?
        AND a.noUsaWeb = 0;
      `,
      [idEmpresa, agencia, ...comprometidos.params, idEmpresa],
    );

    const total = Number(row?.total ?? 0);

    return {
      total,
      conStock: Number(row?.conStock ?? 0),
      sinStock: Number(row?.sinStock ?? 0),
      porcentajeConStock: total ? +(100 * row.conStock / total).toFixed(2) : 0,
      porcentajeSinStock: total ? +(100 * row.sinStock / total).toFixed(2) : 0,
    };
  }

  async listarGruposYSubgrupos() {
    const grupos = await this.dataSource.query(
      `SELECT codigo, nombre FROM admin001000.grupos ORDER BY nombre ASC;`,
    );

    const subgrupos = await this.dataSource.query(
      `SELECT codigo AS grupoCodigo, subcodigo, nombre 
       FROM admin001000.subgrupos 
       ORDER BY codigo ASC, nombre ASC;
      `,
    );

    const subgruposPorGrupo: Record<string, any[]> = {};
    for (const s of subgrupos) {
      if (!subgruposPorGrupo[s.grupoCodigo]) subgruposPorGrupo[s.grupoCodigo] = [];
      subgruposPorGrupo[s.grupoCodigo].push({
        codigo: s.subcodigo,
        nombre: s.nombre,
      });
    }

    return { grupos, subgruposPorGrupo };
  }

  async listarArticulosGuestPaginated(page = 1, limit = 50, q?: string) {
    const skip = (page - 1) * limit;
    const where = q
      ? `WHERE a.noUsaWeb = 0 AND (
          a.nombre LIKE ? OR a.codigo LIKE ? OR a.referencia LIKE ? OR a.marca LIKE ? OR a.modelo LIKE ?
          OR EXISTS (
            SELECT 1 FROM admin001000.invcodalternativo ca
            WHERE ca.id_empresa = a.id_empresa 
              AND (ca.codalternativo LIKE ? OR ca.codigo LIKE ?)
              AND ca.codigo = a.codigo
          )
        )`
      : `WHERE a.noUsaWeb = 0`;

    const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`] : [];

    const [rows, totalRows] = await Promise.all([
      this.dataSource.query(
        `
        SELECT a.codigo, a.nombre, a.referencia, a.rutafoto
        FROM admin001000.articulo a
        ${where}
        ORDER BY a.nombre ASC
        LIMIT ? OFFSET ?;
      `,
        [...params, limit, skip],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS total FROM admin001000.articulo a ${where};`,
        params,
      ),
    ]);

    const total = Number(totalRows?.[0]?.total ?? 0);

    const articulos = await Promise.all(
      rows.map(async (a: any) => {
        const alternativos = await this.dataSource.query(
          `
          SELECT codalternativo 
          FROM admin001000.invcodalternativo
          WHERE id_empresa = '001000' AND codigo = ?;
        `,
          [a.codigo],
        );
        return {
          ...a,
          rutafoto: this.mapRutaImagen(a.rutafoto),
          codigosAlternativos: alternativos.map((x: any) => x.codalternativo),
        };
      }),
    );

    return {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: articulos,
    };
  }

  private mapRutaImagen(ruta: string): string {
    const baseUrl = process.env.IMAGES_BASE_URL || 'http://localhost:3001/images';
    if (!ruta || ruta.trim() === "") return `${baseUrl}/carrito.png`;
    const fileName = ruta.split("\\").pop()?.split("/").pop();
    if (!fileName) return `${baseUrl}/carrito.png`;
    return `${baseUrl}/${encodeURIComponent(fileName)}`;
  }

  async listarModelos(idEmpresa: string, grupo?: string, subgrupo?: string) {
    let query = `
      SELECT DISTINCT TRIM(modelo) AS modelo
      FROM admin001000.articulo
      WHERE id_empresa = ?
        AND noUsaWeb = 0
        AND modelo IS NOT NULL
        AND TRIM(modelo) <> ''
    `;
    const params: any[] = [idEmpresa];

    if (grupo) {
      query += ` AND grupo = ?`;
      params.push(grupo);
    }

    if (subgrupo) {
      query += ` AND subgrupo = ?`;
      params.push(subgrupo);
    }

    query += ` ORDER BY modelo ASC`;

    const modelos = await this.dataSource.query(query, params);
    return modelos.map((m: any) => m.modelo);
  }
}
