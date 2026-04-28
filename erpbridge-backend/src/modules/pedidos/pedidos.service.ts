import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomInt, createHash } from 'crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MailerService } from '@nestjs-modules/mailer';
import * as htmlToPdf from 'html-pdf-node';
import { buildPedidoHtml } from 'src/templates/pedido-template';
import { CarritoService } from '../carrito/carrito.service';

const PEDIDOS_EMAIL = 'pedidos_hyh@yahoo.com';

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private readonly mailerService: MailerService,
    private readonly carritoService: CarritoService,
  ) {}

  private async notificarErrorAdmin(
    tipo: 'PEDIDO_ERROR' | 'EMAIL_ERROR' | 'PDF_ERROR' | 'BACKEND_CAIDO',
    detalles: {
      documento?: string;
      cliente?: string;
      error: string;
      stack?: string;
      contexto?: Record<string, any>;
    },
  ) {
    try {
      const fecha = new Date().toLocaleString('es-ES', { timeZone: 'America/Caracas' });
      
      const tipoLabels = {
        'PEDIDO_ERROR': '🚨 Error al Crear Pedido',
        'EMAIL_ERROR': '📧 Error al Enviar Email',
        'PDF_ERROR': '📄 Error al Generar PDF',
        'BACKEND_CAIDO': '🔴 Backend/ERP No Disponible',
      };

      await this.mailerService.sendMail({
        to: process.env.ADMIN_ERROR_EMAIL || process.env.NOTIFICATION_EMAIL || '',
        subject: `${tipoLabels[tipo]} - ${detalles.documento || 'Sin documento'}`,
        from: `"i.SYNC Alertas" <${process.env.NOTIFICATION_EMAIL}>`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">${tipoLabels[tipo]}</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f8f9fa;">
                <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Fecha/Hora:</strong></td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${fecha}</td>
              </tr>
              ${detalles.documento ? `
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Documento:</strong></td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${detalles.documento}</td>
              </tr>
              ` : ''}
              ${detalles.cliente ? `
              <tr style="background: #f8f9fa;">
                <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Cliente:</strong></td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${detalles.cliente}</td>
              </tr>
              ` : ''}
            </table>

            <h3 style="color: #495057;">Mensaje de Error:</h3>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap;">${detalles.error}</pre>

            ${detalles.stack ? `
            <h3 style="color: #495057;">Stack Trace:</h3>
            <pre style="background: #fff3cd; padding: 15px; border-radius: 5px; font-size: 12px; overflow-x: auto; white-space: pre-wrap;">${detalles.stack}</pre>
            ` : ''}

            ${detalles.contexto ? `
            <h3 style="color: #495057;">Contexto Adicional:</h3>
            <pre style="background: #e7f3ff; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(detalles.contexto, null, 2)}</pre>
            ` : ''}

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
            <small style="color: #6c757d;">Este es un mensaje automático del sistema i.SYNC</small>
          </div>
        `,
      });

      this.logger.log(`Error notification sent to admin`);
    } catch (emailError) {
      this.logger.error(`Failed to send admin error notification: ${emailError.message}`);
    }
  }

  private async procesarEmailBackground(params: {
    destino: string[];
    clienteNombre: string;
    documento: string;
    subtotal: number;
    totalImpuesto: number;
    totalFinal: number;
    detalles: any[];
    empresaNombre: string;
    formafiscal: number;
    notas?: string;
  }) {
    const { destino, clienteNombre, documento, subtotal, totalImpuesto, totalFinal, detalles, empresaNombre, formafiscal, notas } = params;

    try {
      this.logger.log(`Generating PDF for order ${documento}`);
      
      const pdfBuffer = await this.generarPDFPedido(
        clienteNombre,
        documento,
        subtotal,
        totalImpuesto,
        totalFinal,
        detalles,
        empresaNombre,
        formafiscal,
        notas,
      );

      this.logger.log(`PDF ready, sending email for order ${documento}`);

      await this.mailerService.sendMail({
        to: destino,
        subject: `Nuevo pedido realizado #${documento}`,
        from: `"i.SYNC - ${empresaNombre}" <${process.env.NOTIFICATION_EMAIL}>`,
        html: `
          <h2>Gracias por tu pedido, ${clienteNombre}</h2>
          <p>Tu pedido con número <b>${documento}</b> ha sido recibido correctamente por <b>${empresaNombre}</b>.</p>
          <hr/>
          <small>Este correo es automático, no responder.</small>
        `,
        attachments: [
          {
            filename: `pedido_${documento}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      this.logger.log(`Email sent for order ${documento}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(`Background email failed for order ${documento}: ${errorMessage}`);

      const esPdfError = errorMessage.toLowerCase().includes('pdf') || 
                         errorMessage.toLowerCase().includes('html') ||
                         errorMessage.toLowerCase().includes('generate');

      await this.notificarErrorAdmin(
        esPdfError ? 'PDF_ERROR' : 'EMAIL_ERROR',
        {
          documento,
          cliente: clienteNombre,
          error: errorMessage,
          stack: errorStack,
          contexto: {
            destinatarios: destino,
            empresa: empresaNombre,
            totalFinal,
            cantidadProductos: detalles.length,
          },
        },
      );
    }
  }

  private async obtenerArticulosBatch(
    codigos: string[],
    tipoPrecio: number,
    queryRunner: any,
  ): Promise<Map<string, any>> {
    if (codigos.length === 0) return new Map();

    const placeholders = codigos.map(() => '?').join(',');
    const campoPrecio = `precio${tipoPrecio}`;

    const articulos = await queryRunner.query(
      `
      SELECT 
        codigo,
        nombre, 
        grupo, 
        subgrupo, 
        unidad, 
        costo_prom, 
        usaserial, 
        compuesto,
        usaexist, 
        impuesto1, 
        empaque,
        IFNULL(aceptadscto, 0) AS aceptadscto,
        IFNULL(origen, 1) AS origen,
        IFNULL(${campoPrecio}, 0) AS precio
      FROM admin001000.articulo
      WHERE codigo IN (${placeholders})
      `,
      codigos,
    );

    const map = new Map<string, any>();
    for (const art of articulos) {
      map.set(art.codigo, art);
    }
    return map;
  }

private async insertarDetallesBatch(
  queryRunner: any,
  idEmpresa: string,
  agencia: string,
  tipodoc: string,
  documento: string,
  detalles: any[],
  codCliente: string,
  vendedor: string,
  tipoPrecio: number,
  uemisor: string,
  almacen: string,
  estacion: string,
  idvalidacion: string,
): Promise<void> {
  if (detalles.length === 0) return;

  const usadosPid = new Set<string>();
  const pids: string[] = [];
  for (let i = 0; i < detalles.length; i++) {
    let pid = this.generateNumericId(12);
    while (usadosPid.has(pid)) pid = this.generateNumericId(12);
    usadosPid.add(pid);
    pids.push(pid);
  }

  const columns = `
    id_empresa, agencia, tipodoc, documento,
    grupo, subgrupo, origen, codigo, nombre,
    costounit, preciounit, preciofin, preciooriginal,
    cantidad, montoneto, montototal,
    impuesto1, impuesto2, impuesto4, baseimpo1,
    unidad, usaserial, compuesto, usaexist, timpueprc, agrupado,
    proveedor, vendedor, tipoprecio, emisor, almacen, estacion,
    pid, aux1, udinamica,
    notas,
    fechadoc, fechayhora,
    enviado_kmonitor, se_imprimio, frog, documentolocal, se_guardo, linbloq,
    idvalidacion
  `.trim();

  const valuePlaceholder = `(
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?,
    CURDATE(), NOW(),
    ?, ?, ?, ?, ?, ?,
    ?
  )`;

  const CHUNK_SIZE = 50;

  for (let i = 0; i < detalles.length; i += CHUNK_SIZE) {
    const chunk = detalles.slice(i, i + CHUNK_SIZE);
    const chunkPids = pids.slice(i, i + CHUNK_SIZE);

    const valuesPlaceholders: string[] = [];
    const params: any[] = [];

    chunk.forEach((d, idx) => {
      valuesPlaceholders.push(valuePlaceholder);
      params.push(
        idEmpresa,
        agencia,
        tipodoc,
        documento,
        d.grupo,
        d.subgrupo,
        d.origen,
        d.codigo,
        d.nombre,
        d.costounit,
        d.preciounit,
        d.preciofin,
        d.preciooriginal,
        d.cantidad,
        d.montoneto,
        d.montototal,
        d.impuesto1,
        d.impuesto2,
        d.impuesto4,
        d.baseimpo1,
        d.unidad,
        d.usaserial,
        d.compuesto,
        d.usaexist,
        d.timpueprc,
        d.agrupado,
        codCliente,
        vendedor,
        tipoPrecio,
        uemisor,
        almacen,
        estacion,
        chunkPids[idx],
        1,
        1,
        '',
        0,
        0,
        0,
        '',
        0,
        0,
        idvalidacion,
      );
    });

    await queryRunner.query(
      `INSERT INTO admin001000.opermv (${columns}) VALUES ${valuesPlaceholders.join(', ')}`,
      params,
    );
  }
}

  async crearPedido(
    idEmpresa: string,
    agencia: string,
    pedido: {
      codCliente: string;
      vendedor: string;
      carrito: { codigo: string; cantidad: number }[];
      notas?: string;
    },
  ) {
    const startTime = Date.now();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Creating order with ${pedido.carrito.length} items`);

      const tipodoc = 'PED';

      if (!pedido.codCliente) throw new Error('Cliente no especificado');
      if (!pedido.carrito?.length) throw new Error('El carrito está vacío');

      const [empresa] = await queryRunner.query(
        `SELECT nombre FROM admin001000.empresas WHERE id_empresa = ? LIMIT 1`,
        [idEmpresa],
      );

      if (!empresa?.nombre) throw new Error('Empresa no encontrada');

      const [cliente] = await queryRunner.query(
        `
        SELECT 
          nombre, nrorif, nronit, direccion, telefonos, 
          precio AS tipoprecio,
          IFNULL(dias, 0) AS diascred, 
          IFNULL(sector, '6') AS sector, 
          IFNULL(descuento, 0) AS descuento,
          IFNULL(formafis, 0) AS formafis,
          wwwcli, vendedor
        FROM admin001000.cliempre
        WHERE codigo = ? LIMIT 1
        `,
        [pedido.codCliente],
      );

      if (!cliente) throw new Error('Cliente no encontrado');

      const tipoPrecio = Number(cliente.tipoprecio ?? 1);
      const formafiscal = Number(cliente.formafis ?? 0);
      const descuentoCliente = Number(cliente.descuento ?? 0);

      const almacen = '1';
      const estacion = 'WEB';
      const uemisor = 'ISYNC';
      const vendedorFinal = 'ISY';

      const codigos = pedido.carrito.map((item) => item.codigo);
      const articulosMap = await this.obtenerArticulosBatch(codigos, tipoPrecio, queryRunner);

      this.logger.log(`Fetched ${articulosMap.size}/${codigos.length} articles`);

      const faltantes = codigos.filter((c) => !articulosMap.has(c));
      if (faltantes.length > 0) {
        throw new Error(`Artículos no encontrados: ${faltantes.slice(0, 5).join(', ')}${faltantes.length > 5 ? '...' : ''}`);
      }

      let totalNeto = 0;
      let totalDescuento = 0;
      let totalImpuesto15 = 0;
      let totalImpuesto18 = 0;
      let baseImpo1Acumulado = 0;
      const detalles: any[] = [];

      for (const item of pedido.carrito) {
        const articulo = articulosMap.get(item.codigo)!;
        const precioBase = Number(articulo.precio ?? 0);

        const aceptaDscto = Number(articulo.aceptadscto ?? 0);
        const aplicaDescuento = aceptaDscto === 0 ? descuentoCliente : 0;

        const cantidad = Number(item.cantidad);
        const preciounit = +Number(precioBase).toFixed(4);
        const dsctoPorc = aplicaDescuento > 0 ? aplicaDescuento : 0;
        const dsctounit = dsctoPorc > 0 ? +(preciounit * (dsctoPorc / 100)).toFixed(4) : 0;
        const preciofin = +(preciounit - dsctounit).toFixed(4);

        const esExento = formafiscal === 3;
        const timpueprc = esExento ? 0 : Number(articulo.impuesto1 ?? 0);

        const montoneto = +(preciofin * cantidad).toFixed(4);

        let impuesto2 = 0;
        let impuesto4 = 0;

        if (timpueprc === 15) impuesto2 = +(montoneto * 0.15).toFixed(4);
        else if (timpueprc === 18) impuesto4 = +(montoneto * 0.18).toFixed(4);

        const impuesto1 = +(impuesto2 + impuesto4).toFixed(4);
        const baseimpo1 = timpueprc > 0 ? montoneto : 0;

        totalNeto += montoneto;
        totalDescuento += +(dsctounit * cantidad).toFixed(4);
        totalImpuesto15 += impuesto2;
        totalImpuesto18 += impuesto4;
        baseImpo1Acumulado += baseimpo1;

        const impuestoUnitario = esExento ? 0 : +(impuesto1 / cantidad).toFixed(4);
        const totalLinea = +(preciofin * cantidad).toFixed(2);

        detalles.push({
          ...articulo,
          codigo: item.codigo,
          nombre: articulo.nombre,
          cantidad,
          preciounit,
          preciooriginal: preciounit,
          preciofin,
          montoneto,
          montototal: montoneto,
          impuesto1,
          impuesto2,
          impuesto4,
          baseimpo1,
          timpueprc,
          costounit: Number(articulo.costo_prom ?? 0) * cantidad,
          origen: Number(articulo.origen ?? 1),
          agrupado: Number(articulo.empaque),
          precioBase: +preciounit.toFixed(2),
          impuestoLinea: +impuestoUnitario.toFixed(2),
          precioUnitario: +preciofin.toFixed(2),
          totalLinea,
        });
      }

      const totalNetoDoc = +totalNeto.toFixed(4);
      const impuesto2Doc = +totalImpuesto15.toFixed(4);
      const impuesto4Doc = +totalImpuesto18.toFixed(4);
      const impuesto1Doc = +(impuesto2Doc + impuesto4Doc).toFixed(4);
      const baseImpo1Doc = +baseImpo1Acumulado.toFixed(4);
      const totalDescuentoDoc = +totalDescuento.toFixed(4);
      const totalFinal = +(totalNetoDoc + impuesto1Doc).toFixed(4);

      // lock both tables to get a consistent document number
      await queryRunner.query(
        `LOCK TABLES admin001000.operti WRITE, admin001000.opermv WRITE`,
      );

      const [last] = await queryRunner.query(
        `
        SELECT IFNULL(MAX(CAST(documento AS UNSIGNED)), 0) AS lastDoc
        FROM admin001000.operti
        WHERE id_empresa = ? AND tipodoc = ?
        `,
        [idEmpresa, tipodoc],
      );

      const newDoc = (Number(last?.lastDoc ?? 0) + 1).toString().padStart(8, '0');
      const idvalidacion = this.generateValidationId(`${pedido.codCliente}-${Date.now()}`);

      await queryRunner.query(
        `
        INSERT INTO admin001000.operti (
          id_empresa, agencia, moneda, tipodoc, documento,
          codcliente, nombrecli, rif, nit, direccion, telefonos,
          tipoprecio, diascred, sector, vendedor,
          emision, recepcion, vence, fechacrea,
          totneto, totimpuest, totalfinal, totdescuen, notas,
          impuesto1, impuesto2, impuesto3, impuesto4,
          baseimpo1, baseimpo2, baseimpo3,
          idvalidacion, uemisor, estacion, al_libro, formafis,
          horadocum, ampm, almacen
        )
        VALUES (
          ?, ?, '000', ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          CURDATE(), CURDATE(), CURDATE(), NOW(),
          ?, ?, ?, ?, ?,
          ?, ?, 0, ?,
          ?, 0, 0,
          ?, ?, ?, 1, ?,
          TIME_FORMAT(NOW(), '%h:%i'), IF(HOUR(NOW()) < 12, 1, 2), ?
        )
        `,
        [
          idEmpresa,
          agencia,
          tipodoc,
          newDoc,
          pedido.codCliente,
          cliente.nombre,
          cliente.nrorif,
          cliente.nronit,
          cliente.direccion,
          cliente.telefonos,
          tipoPrecio,
          cliente.diascred,
          cliente.sector,
          vendedorFinal,
          totalNetoDoc,
          impuesto1Doc,
          totalFinal,
          totalDescuentoDoc,
          (pedido.notas || '').trim(),
          impuesto1Doc,
          impuesto2Doc,
          impuesto4Doc,
          baseImpo1Doc,
          idvalidacion,
          uemisor,
          estacion,
          formafiscal,
          almacen,
        ],
      );

      await this.insertarDetallesBatch(
        queryRunner,
        idEmpresa,
        agencia,
        tipodoc,
        newDoc,
        detalles,
        pedido.codCliente,
        vendedorFinal,
        tipoPrecio,
        uemisor,
        almacen,
        estacion,
        idvalidacion,
      );

      this.logger.log(`Batch insert complete`);

      await queryRunner.query(`UNLOCK TABLES`);
      await queryRunner.commitTransaction();

      const elapsed = Date.now() - startTime;
      this.logger.log(`Order ${newDoc} created in ${elapsed}ms (${detalles.length} items)`);

      let destino: string[] = [PEDIDOS_EMAIL];
      if (cliente?.wwwcli?.trim()) {
        destino.push(String(cliente.wwwcli).trim());
      }

      if (destino.length > 0) {
        this.procesarEmailBackground({
          destino,
          clienteNombre: cliente.nombre,
          documento: newDoc,
          subtotal: totalNetoDoc,
          totalImpuesto: impuesto1Doc,
          totalFinal,
          detalles,
          empresaNombre: empresa.nombre,
          formafiscal,
          notas: pedido.notas,
        }).catch((err) => {
          this.logger.error(`Unexpected error in background email: ${err.message}`);
        });

        this.logger.log(`Background email queued for order ${newDoc} → ${destino.join(', ')}`);
      }

      await this.carritoService.clear(pedido.codCliente);

      return {
        success: true,
        mensaje: `Pedido ${newDoc} creado correctamente`,
        documento: newDoc,
        idvalidacion,
        totalFinal,
        emailEnviandose: destino.length > 0,
        tiempoProcesamiento: `${elapsed}ms`,
      };
    } catch (error) {
      try {
        await queryRunner.query(`UNLOCK TABLES`);
      } catch {}
      await queryRunner.rollbackTransaction();

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Order creation failed: ${errorMessage}`);

      const key = `pedido:${Date.now()}`;
      await this.cache.set(key, { idEmpresa, agencia, pedido }, 86400);

      const esBackendCaido = this.esErrorDeConexion(errorMessage);

      await this.notificarErrorAdmin(
        esBackendCaido ? 'BACKEND_CAIDO' : 'PEDIDO_ERROR',
        {
          cliente: pedido.codCliente,
          error: errorMessage,
          stack: errorStack,
          contexto: {
            idEmpresa,
            agencia,
            cantidadItems: pedido.carrito?.length || 0,
            notas: pedido.notas,
            guardadoEnRedis: key,
          },
        },
      );

      return {
        success: false,
        storedInRedis: true,
        mensaje: esBackendCaido
          ? 'El sistema ERP no está disponible en este momento. Tu pedido ha sido guardado y se procesará automáticamente cuando el servicio se restablezca.'
          : `Error al crear el pedido: ${errorMessage}. El pedido ha sido guardado para reintento automático.`,
        error: errorMessage,
        tipoError: esBackendCaido ? 'BACKEND_CAIDO' : 'PEDIDO_ERROR',
      };
    } finally {
      await queryRunner.release();
    }
  }

  private esErrorDeConexion(errorMessage: string): boolean {
    const patronesConexion = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'connection refused',
      'connect ETIMEDOUT',
      'getaddrinfo',
      'socket hang up',
      'Connection lost',
      'ER_CON_COUNT_ERROR',
      'Too many connections',
      'Connection is closed',
      'Cannot reach',
      'timeout',
    ];

    const msgLower = errorMessage.toLowerCase();
    return patronesConexion.some((patron) => msgLower.includes(patron.toLowerCase()));
  }

  private async generarPDFPedido(
    clienteNombre: string,
    documento: string,
    subtotal: number,
    impuestoTotal: number,
    totalFinal: number,
    detalles: any[],
    empresaNombre: string,
    formafiscal: number,
    notas?: string,
  ): Promise<Buffer> {
    const html = buildPedidoHtml(
      clienteNombre,
      documento,
      subtotal,
      impuestoTotal,
      totalFinal,
      detalles,
      empresaNombre,
      formafiscal,
      notas,
    );

    const file = { content: html };
    return await (htmlToPdf as any).generatePdf(file, {
      format: 'A4',
      printBackground: true,
    });
  }

  async procesarPendientes() {
    const store = (this.cache as any)?.store;

    if (!store || typeof store.keys !== 'function') return;

    let keys: string[] = [];

    try {
      keys = await store.keys('pedido:*');
    } catch {
      return;
    }

    this.logger.log(`Retrying ${keys.length} pending orders`);

    for (const key of keys) {
      const data = (await this.cache.get(key)) as {
        idEmpresa: string;
        agencia: string;
        pedido: {
          codCliente: string;
          vendedor: string;
          carrito: { codigo: string; cantidad: number }[];
          notas?: string;
        };
      };

      if (!data) {
        await this.cache.del(key);
        continue;
      }

      try {
        this.logger.log(`Retrying pending order: ${key}`);
        const resultado = await this.crearPedido(data.idEmpresa, data.agencia, data.pedido);
        
        if (resultado.success) {
          await this.cache.del(key);
          this.logger.log(`Pending order processed: ${resultado.documento}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to retry order ${key}: ${errorMsg}`);
      }
    }
  }

  private generateValidationId(seed: string): string {
    return createHash('md5').update(seed).digest('hex').substring(0, 12).toUpperCase();
  }

  private generateNumericId(length = 12): string {
    let id = '';
    while (id.length < length) id += randomInt(0, 10).toString();
    return id;
  }

  async listarPedidosPaginated(
    idEmpresa: string,
    codCliente: string,
    page = 1,
    limit = 50,
    q?: string,
  ) {
    const skip = (page - 1) * limit;
    const params: any[] = [idEmpresa, codCliente];
    let where = `WHERE id_empresa = ? AND tipodoc = 'PED' AND codcliente = ?`;

    if (q && q.trim() !== '') {
      where += ` AND documento LIKE ?`;
      params.push(`%${q}%`);
    }

    const [totalRow] = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM admin001000.operti ${where}`,
      params,
    );
    const total = Number(totalRow?.total ?? 0);

    const pedidos = await this.dataSource.query(
      `
      SELECT 
        documento,
        codcliente,
        nombrecli,
        vendedor,
        totneto,
        totalfinal,
        uemisor,
        DATE_FORMAT(emision, '%Y-%m-%d') AS fecha
      FROM admin001000.operti
      ${where}
      ORDER BY CAST(documento AS UNSIGNED) DESC
      LIMIT ? OFFSET ?;
      `,
      [...params, limit, skip],
    );

    return {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: pedidos,
    };
  }

  async obtenerDetallePedido(idEmpresa: string, documento: string, codCliente: string) {
    try {
      const [cabecera] = await this.dataSource.query(
        `
        SELECT 
          o.documento,
          o.codcliente,
          o.nombrecli,
          o.direccion,
          o.telefonos,
          DATE_FORMAT(o.emision, '%Y-%m-%d') AS fecha,
          o.totneto,
          o.totimpuest,
          o.totalfinal,
          o.totdescuen,
          o.notas,
          o.vendedor
        FROM admin001000.operti AS o
        WHERE o.id_empresa = ? AND o.documento = ? AND o.tipodoc = 'PED' AND o.codcliente = ?
        LIMIT 1;
        `,
        [idEmpresa, documento, codCliente],
      );

      if (!cabecera) {
        return {
          pedido: null,
          productos: [],
          error: `No tienes acceso a este pedido`,
        };
      }

      const productos = await this.dataSource.query(
        `
        SELECT 
          codigo,
          nombre,
          cantidad,
          preciounit,
          montototal,
          dsctounit,
          impuesto1 AS impuesto,
          grupo,
          subgrupo
        FROM admin001000.opermv
        WHERE id_empresa = ? AND documento = ? AND tipodoc = 'PED'
        ORDER BY codigo ASC;
        `,
        [idEmpresa, documento],
      );

      return {
        pedido: {
          documento: cabecera.documento,
          fecha: cabecera.fecha,
          cliente: cabecera.nombrecli,
          codcliente: cabecera.codcliente,
          direccion: cabecera.direccion?.trim() || 'N/A',
          telefonos: cabecera.telefonos?.trim() || 'N/A',
          vendedor: cabecera.vendedor,
          notas: cabecera.notas || '',
          subtotal: Number(cabecera.totneto || 0),
          impuestos: Number(cabecera.totimpuest || 0),
          descuento: Number(cabecera.totdescuen || 0),
          total: Number(cabecera.totalfinal || 0),
          cantidadTotal: productos.reduce((acc, p) => acc + Number(p.cantidad || 0), 0),
          totalProductos: productos.length,
        },
        productos,
      };
    } catch {
      return {
        pedido: null,
        productos: [],
        error: 'Error al obtener detalle del pedido',
      };
    }
  }

  async obtenerTotalesDashboard(idEmpresa: string, codCliente: string) {
    try {
      const [totales] = await this.dataSource.query(
        `
          SELECT 
            COUNT(*) AS totalPedidos,
            IFNULL(SUM(totalfinal), 0) AS totalFacturado
          FROM admin001000.operti
          WHERE id_empresa = ?
            AND tipodoc = 'PED'
            AND codcliente = ?;
        `,
        [idEmpresa, codCliente],
      );

      const dataGrafico = await this.dataSource.query(
        `
          SELECT 
            DATE_FORMAT(emision, '%Y-%m') AS mes,
            COUNT(*) AS cantidad
          FROM admin001000.operti
          WHERE id_empresa = ?
            AND tipodoc = 'PED'
            AND codcliente = ?
            AND emision IS NOT NULL
            AND emision NOT IN ('0000-00-00','0001-01-01')
            AND emision >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(emision, '%Y-%m')
          ORDER BY emision DESC;
        `,
        [idEmpresa, codCliente],
      );

      const meses = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
      ];

      const chart = dataGrafico
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .map((r: any) => {
          const [anio, mes] = r.mes.split('-');
          return {
            mes: `${meses[parseInt(mes, 10) - 1]} ${anio}`,
            ordenes: Number(r.cantidad),
          };
        });

      return {
        totalPedidos: Number(totales?.totalPedidos ?? 0),
        totalFacturado: Number(totales?.totalFacturado ?? 0),
        chart,
      };
    } catch {
      return { totalPedidos: 0, totalFacturado: 0, chart: [] };
    }
  }
}