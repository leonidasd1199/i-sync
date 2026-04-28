import { Entity, PrimaryColumn, Column } from 'typeorm';


@Entity({ name: 'agencias' })
export class Agencias {
  // === IDENTIFIERS ===
  @PrimaryColumn({ name: 'id_empresa', type: 'varchar', length: 6 })
  idEmpresa: string;

  @PrimaryColumn({ name: 'agencia', type: 'varchar', length: 3 })
  agencia: string;

  // === BASIC INFORMATION ===
  @Column({ name: 'nombre', type: 'varchar', length: 40 })
  nombre: string;

  @Column({ name: 'direccion', type: 'varchar', length: 254 })
  direccion: string;

  @Column({ name: 'telefonos', type: 'varchar', length: 50 })
  telefonos: string;

  @Column({ name: 'represent', type: 'varchar', length: 70 })
  represent: string;

  @Column({ name: 'email', type: 'varchar', length: 50 })
  email: string;

  // === DOCUMENT COUNTERS ===
  @Column({ name: 'cfactura1', type: 'varchar', length: 8 })
  cFactura1: string;

  @Column({ name: 'cfactura2', type: 'varchar', length: 8 })
  cFactura2: string;

  @Column({ name: 'seriefac_b', type: 'varchar', length: 8 })
  serieFacB: string;

  @Column({ name: 'seriefac_c', type: 'varchar', length: 8 })
  serieFacC: string;

  @Column({ name: 'seriefac_d', type: 'varchar', length: 8 })
  serieFacD: string;

  @Column({ name: 'seriefac_e', type: 'varchar', length: 8 })
  serieFacE: string;

  @Column({ name: 'cnotaent', type: 'varchar', length: 8 })
  cNotaEnt: string;

  @Column({ name: 'cpresup', type: 'varchar', length: 8 })
  cPresup: string;

  @Column({ name: 'cpresupweb', type: 'varchar', length: 7, nullable: true })
  cPresupWeb?: string;

  @Column({ name: 'pnotacred', type: 'varchar', length: 8 })
  pNotaCred: string;

  @Column({ name: 'pretencion', type: 'varchar', length: 8 })
  pRetencion: string;

  @Column({ name: 'pretencion2', type: 'varchar', length: 8 })
  pRetencion2: string;

  @Column({ name: 'cconcilia', type: 'varchar', length: 8 })
  cConcilia: string;

  @Column({ name: 'cordencomp', type: 'varchar', length: 8 })
  cOrdenComp: string;

  @Column({ name: 'cpedidov', type: 'varchar', length: 8 })
  cPedidoV: string;

  @Column({ name: 'cpedidovweb', type: 'varchar', length: 7, nullable: true })
  cPedidoVWeb?: string;

  @Column({ name: 'pedidocom', type: 'varchar', length: 8 })
  pedidoCom: string;

  @Column({ name: 'cdevolucic', type: 'varchar', length: 8 })
  cDevoluciC: string;

  @Column({ name: 'cnotacred', type: 'varchar', length: 8 })
  cNotaCred: string;

  @Column({ name: 'cnotacred2', type: 'varchar', length: 8 })
  cNotaCred2: string;

  @Column({ name: 'cretencli', type: 'varchar', length: 8 })
  cRetenCli: string;

  @Column({ name: 'cretencli2', type: 'varchar', length: 8 })
  cRetenCli2: string;

  @Column({ name: 'ccompegre', type: 'varchar', length: 8 })
  cCompEgre: string;

  @Column({ name: 'pnotadeb', type: 'varchar', length: 8 })
  pNotaDeb: string;

  @Column({ name: 'cexisten', type: 'varchar', length: 8 })
  cExisten: string;

  @Column({ name: 'ctransac', type: 'varchar', length: 8 })
  cTransac: string;

  @Column({ name: 'creccob', type: 'varchar', length: 8 })
  cRecCob: string;

  @Column({ name: 'cajuste', type: 'varchar', length: 8 })
  cAjuste: string;

  @Column({ name: 'cordprod', type: 'varchar', length: 8 })
  cOrdProd: string;

  @Column({ name: 'csolicitud', type: 'varchar', length: 8 })
  cSolicitud: string;

  @Column({ name: 'cplanpago', type: 'varchar', length: 8 })
  cPlanPago: string;

  @Column({ name: 'financiar', type: 'varchar', length: 8 })
  financiar: string;

  @Column({ name: 'cplancobro', type: 'varchar', length: 8 })
  cPlanCobro: string;

  @Column({ name: 'crecibo', type: 'varchar', length: 8 })
  cRecibo: string;

  @Column({ name: 'crecibocob', type: 'varchar', length: 8 })
  cReciboCob: string;

  @Column({ name: 'crelacomi', type: 'varchar', length: 8 })
  cRelaComi: string;

  @Column({ name: 'cdevoluci', type: 'varchar', length: 8 })
  cDevoluci: string;

  @Column({ name: 'cnotadeb', type: 'varchar', length: 8 })
  cNotaDeb: string;

  @Column({ name: 'cnotadeb2', type: 'varchar', length: 8 })
  cNotaDeb2: string;

  @Column({ name: 'conschq', type: 'varchar', length: 8 })
  consChq: string;

  @Column({ name: 'cguiaremision', type: 'varchar', length: 8 })
  cGuiaRemision: string;

  // === FORMATS ===
  @Column({ name: 'formatofac1', type: 'varchar', length: 25 })
  formatoFac1: string;

  @Column({ name: 'formatofac2', type: 'varchar', length: 25 })
  formatoFac2: string;

  @Column({ name: 'formatofacb', type: 'varchar', length: 25 })
  formatoFacB: string;

  @Column({ name: 'formatofacc', type: 'varchar', length: 25 })
  formatoFacC: string;

  @Column({ name: 'formatofacd', type: 'varchar', length: 25 })
  formatoFacD: string;

  @Column({ name: 'formatoface', type: 'varchar', length: 25 })
  formatoFacE: string;

  @Column({ name: 'formatopre', type: 'varchar', length: 25 })
  formatoPre: string;

  @Column({ name: 'formatonot', type: 'varchar', length: 25 })
  formatoNot: string;

  @Column({ name: 'pagoadelantado', type: 'varchar', length: 8 })
  pagoAdelantado: string;

  @Column({ name: 'despacho', type: 'varchar', length: 8 })
  despacho: string;

  @Column({ name: 'despacho_psk', type: 'varchar', length: 8, nullable: true })
  despachoPsk?: string;

  @Column({ name: 'despacho_delivery', type: 'varchar', length: 8 })
  despachoDelivery: string;

  @Column({ name: 'despacho_correlativo', type: 'int', unsigned: true, default: 0 })
  despachoCorrelativo: number;

  @Column({ name: 'cnrodoc2', type: 'varchar', length: 8 })
  cNroDoc2: string;

  @Column({ name: 'carqueocaja', type: 'varchar', length: 8 })
  cArqueoCaja: string;

  @Column({ name: 'ctranexis', type: 'varchar', length: 8 })
  cTranExis: string;

  @Column({ name: 'ccambiopre', type: 'varchar', length: 8 })
  cCambioPre: string;

  @Column({ name: 'cordserv', type: 'varchar', length: 8 })
  cOrdServ: string;

  @Column({ name: 'cconteoinv', type: 'varchar', length: 8 })
  cConteoInv: string;

  @Column({ name: 'cegreso', type: 'varchar', length: 8 })
  cEgreso: string;

  @Column({ name: 'clientefac1', type: 'varchar', length: 20 })
  clienteFac1: string;

  // === DOCUMENT SETTINGS ===
  @Column({ name: 'tipodocfiscal1', type: 'double', precision: 1, scale: 0, default: 0 })
  tipoDocFiscal1: number;

  @Column({ name: 'cprefijoserie1', type: 'varchar', length: 4 })
  cPrefijoSerie1: string;

  @Column({ name: 'ctipodocumento1', type: 'varchar', length: 250 })
  cTipoDocumento1: string;

}
