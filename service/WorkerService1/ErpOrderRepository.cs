using MySql.Data.MySqlClient;

namespace WorkerService1
{
    internal record DecimalConfig(
        int  Pvp,
        int  Cantidad,
        int  SubTotal,
        int  Total,
        int  Porcentaje,
        bool RedondearTotal,
        int  Impuesto,
        bool RedondearImpuesto
    );

    internal class LineaDetalle
    {
        public string Sku            { get; set; } = "";
        public int    Cantidad       { get; set; }
        public string Nombre         { get; set; } = "";
        public string Grupo          { get; set; } = "";
        public string Subgrupo       { get; set; } = "";
        public string Unidad         { get; set; } = "";
        public int    Usaserial      { get; set; }
        public int    Compuesto      { get; set; }
        public int    Usaexist       { get; set; }
        public double Agrupado       { get; set; }
        public int    Origen         { get; set; }
        public double Costounit      { get; set; }
        public double Preciounit     { get; set; }
        public double Preciofin      { get; set; }
        public double Preciooriginal { get; set; }
        public double Montoneto      { get; set; }
        public double Montototal     { get; set; }
        public double Timpueprc      { get; set; }
        public double Impuesto1      { get; set; }
        public double Impuesto2      { get; set; }
        public double Impuesto4      { get; set; }
        public double Baseimpo1      { get; set; }
        public string Pid            { get; set; } = "";
    }

    internal class ErpOrderRepository
    {
        private readonly string _connectionString;
        private readonly string _empresa;
        private readonly string _agencia;
        private readonly string _dbName;
        private readonly string _almacen;
        private readonly string _defaultClientCode;
        private readonly string _defaultVendedor;
        private readonly int    _defaultTipoPrecio;
        private readonly string _defaultEstacion;
        private readonly string _defaultUemisor;

        public ErpOrderRepository(ShopifySettings s)
        {
            _connectionString  = s.ConnectionString;
            _empresa           = s.Empresa;
            _agencia           = s.Agencia;
            _dbName            = s.DbName;
            _almacen           = s.Almacen;
            _defaultClientCode = s.DefaultClientCode;
            _defaultVendedor   = s.DefaultVendedor;
            _defaultTipoPrecio = s.DefaultTipoPrecio;
            _defaultEstacion   = s.DefaultEstacion;
            _defaultUemisor    = s.DefaultUemisor;
        }

        // ── Helpers ───────────────────────────────────────────────────────

        public static double RoundERP(double value, int decimales)
            => decimales > 0 ? Math.Round(value, decimales, MidpointRounding.AwayFromZero) : value;

        // ── Decimal config ────────────────────────────────────────────────

        public async Task<DecimalConfig> GetDecimalConfigAsync(MySqlConnection cn)
        {
            var cmd = new MySqlCommand(
                $"SELECT IFNULL(TRIM(cfgdecimales), '') FROM {_dbName}.Config WHERE id_empresa = @id_empresa LIMIT 1", cn);
            cmd.Parameters.AddWithValue("@id_empresa", _empresa);
            var result = await cmd.ExecuteScalarAsync();
            string raw = result == null || result == DBNull.Value ? "" : result.ToString()!.Trim();

            static int digit(string s, int pos) =>
                pos < s.Length && char.IsDigit(s[pos]) ? s[pos] - '0' : 4;

            return new DecimalConfig(
                Pvp:               digit(raw, 0),
                Cantidad:          digit(raw, 1),
                SubTotal:          digit(raw, 2),
                Total:             digit(raw, 3),
                Porcentaje:        digit(raw, 4),
                RedondearTotal:    raw.Length > 5  && raw[5]  == '1',
                Impuesto:          digit(raw, 6),
                RedondearImpuesto: raw.Length > 11 && raw[11] == '1'
            );
        }

        // ── Order checks ──────────────────────────────────────────────────

        public async Task<bool> OrderExistsAsync(MySqlConnection cn, string shopifyOrderId)
        {
            var cmd = new MySqlCommand(
                "SELECT COUNT(1) FROM opermv WHERE shopify_order_id = @id", cn);
            cmd.Parameters.AddWithValue("@id", shopifyOrderId);
            return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
        }

        public async Task<int> GetNextDocumentNumberAsync(MySqlConnection cn)
        {
            var cmd = new MySqlCommand(@"
                SELECT IFNULL(MAX(CAST(documento AS UNSIGNED)), 0)
                FROM operti
                WHERE id_empresa = @id_empresa AND tipodoc = @tipodoc", cn);
            cmd.Parameters.AddWithValue("@id_empresa", _empresa);
            cmd.Parameters.AddWithValue("@tipodoc",    "PED");
            return Convert.ToInt32(await cmd.ExecuteScalarAsync()) + 1;
        }

        // ── Inventory ─────────────────────────────────────────────────────

        public async Task<double> GetAvailableInventoryAsync(MySqlConnection cn, string codigo)
        {
            var cmd = new MySqlCommand(@"
                SELECT GREATEST(
                    COALESCE((
                        SELECT SUM(e.existencia) FROM existenc e
                        WHERE e.codigo = @codigo AND e.almacen = @almacen
                    ), 0)
                    -
                    COALESCE((
                        SELECT SUM(mv.cantidad)
                        FROM opermv mv
                        INNER JOIN operti ti
                            ON ti.id_empresa = mv.id_empresa AND ti.agencia   = mv.agencia
                           AND ti.tipodoc    = mv.tipodoc    AND ti.documento = mv.documento
                        WHERE ti.id_empresa = @empresa AND ti.agencia = @agencia
                          AND ti.tipodoc    = 'PED'
                          AND ti.seimporto  = 0 AND ti.estatusdoc = '0'
                          AND mv.almacen    = @almacen AND mv.codigo = @codigo
                    ), 0),
                0) AS disponible", cn);

            cmd.Parameters.AddWithValue("@codigo",  codigo);
            cmd.Parameters.AddWithValue("@almacen", _almacen);
            cmd.Parameters.AddWithValue("@empresa", _empresa);
            cmd.Parameters.AddWithValue("@agencia", _agencia);

            var result = await cmd.ExecuteScalarAsync();
            return result != null && result != DBNull.Value ? Convert.ToDouble(result) : 0.0;
        }

        public async Task<DateTime?> GetInventoryTimestampAsync(MySqlConnection cn, string codigo)
        {
            var cmd = new MySqlCommand(
                "SELECT updated_at FROM existenc WHERE codigo = @codigo AND almacen = @almacen", cn);
            cmd.Parameters.AddWithValue("@codigo",  codigo);
            cmd.Parameters.AddWithValue("@almacen", _almacen);
            var result = await cmd.ExecuteScalarAsync();
            if (result == null || result == DBNull.Value) return null;
            return DateTimeOffset.TryParse(result.ToString(), out var dto) ? dto.UtcDateTime : (DateTime?)null;
        }

        public async Task MarkInventorySyncedAsync(MySqlConnection cn, string codigo, double existencia, DateTime? fechaModifi)
        {
            var cmd = new MySqlCommand(@"
                INSERT INTO existenc (codigo, almacen, existencia, updated_at, last_synced_to_shopify)
                VALUES (@codigo, @almacen, @existencia, NOW(), @fechamodifi)
                ON DUPLICATE KEY UPDATE last_synced_to_shopify = @fechamodifi;", cn);
            cmd.Parameters.AddWithValue("@codigo",      codigo);
            cmd.Parameters.AddWithValue("@almacen",     _almacen);
            cmd.Parameters.AddWithValue("@existencia",  existencia);
            cmd.Parameters.AddWithValue("@fechamodifi", fechaModifi.HasValue ? (object)fechaModifi.Value : DBNull.Value);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task UpdateInventoryFromShopifyAsync(MySqlConnection cn, string codigo, double cantidad)
        {
            var cmd = new MySqlCommand(
                "CALL ActualizarExistenciaFromShopify(@codigo, @almacen, @cantidad)", cn);
            cmd.Parameters.AddWithValue("@codigo",   codigo);
            cmd.Parameters.AddWithValue("@almacen",  _almacen);
            cmd.Parameters.AddWithValue("@cantidad", cantidad);
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Line building (PrepararLineas) ────────────────────────────────

        public async Task<List<LineaDetalle>> PrepararLineasAsync(
            MySqlConnection cn, ShopifyOrder order, DecimalConfig dcfg)
        {
            var lineas   = new List<LineaDetalle>();
            var usedPids = new HashSet<string>();
            string campoPrecio    = $"precio{_defaultTipoPrecio}";
            string campoPreciofin = $"preciofin{_defaultTipoPrecio}";

            foreach (var li in order.LineItems)
            {
                string sku      = li.Sku;
                int    cantidad = li.Quantity;

                var artCmd = new MySqlCommand($@"
                    SELECT
                        IFNULL(nombre,    '')  AS nombre,
                        IFNULL(grupo,     '')  AS grupo,
                        IFNULL(subgrupo,  '')  AS subgrupo,
                        IFNULL(unidad,    '')  AS unidad,
                        IFNULL(usaserial, 0)   AS usaserial,
                        IFNULL(empaque,   0)   AS empaque,
                        IFNULL(compuesto, 0)   AS compuesto,
                        IFNULL(usaexist,  0)   AS usaexist,
                        IFNULL(origen,    1)   AS origen,
                        IFNULL(costo_prom,0)   AS costo_prom,
                        IFNULL({campoPrecio},    0) AS precio_base,
                        IFNULL({campoPreciofin}, 0) AS preciofin
                    FROM articulo WHERE codigo = @codigo LIMIT 1", cn);
                artCmd.Parameters.AddWithValue("@codigo", sku);

                string nombre = sku, grupo = "", subgrupo = "", unidad = "";
                int    usaserial = 0, compuesto = 0, usaexist = 0, origen = 1;
                double empaque = 0, costoProm = 0, preciounit = 0, preciofin_unit = 0;

                using (var r = await artCmd.ExecuteReaderAsync())
                {
                    if (await r.ReadAsync())
                    {
                        nombre         = r["nombre"].ToString()   ?? sku;
                        grupo          = r["grupo"].ToString()    ?? "";
                        subgrupo       = r["subgrupo"].ToString() ?? "";
                        unidad         = r["unidad"].ToString()   ?? "";
                        usaserial      = Convert.ToInt32(r["usaserial"]);
                        empaque        = Convert.ToDouble(r["empaque"]);
                        compuesto      = Convert.ToInt32(r["compuesto"]);
                        usaexist       = Convert.ToInt32(r["usaexist"]);
                        origen         = Convert.ToInt32(r["origen"]);
                        costoProm      = Convert.ToDouble(r["costo_prom"]);
                        double precioBase = Convert.ToDouble(r["precio_base"]);
                        preciofin_unit    = Convert.ToDouble(r["preciofin"]);
                        // precio1 is stored with whatever precision was entered;
                        // impuesto1 = difference between preciofin1 and precio1.
                        preciounit = (precioBase > 0 && precioBase <= preciofin_unit)
                            ? precioBase : preciofin_unit;
                    }
                }

                double preciounitR  = RoundERP(preciounit, dcfg.Pvp);
                double montoneto    = RoundERP(preciounitR * cantidad, dcfg.Total);
                double impuesto1ln  = dcfg.RedondearImpuesto
                    ? RoundERP((preciofin_unit - preciounitR) * cantidad, dcfg.Impuesto)
                    : (preciofin_unit - preciounitR) * cantidad;
                double totallinea   = dcfg.RedondearTotal
                    ? RoundERP(montoneto + impuesto1ln, dcfg.Total)
                    : montoneto + impuesto1ln;

                string pid;
                do { pid = GenerateNumericId(12); } while (usedPids.Contains(pid));
                usedPids.Add(pid);

                lineas.Add(new LineaDetalle
                {
                    Sku            = sku,
                    Cantidad       = cantidad,
                    Nombre         = nombre,
                    Grupo          = grupo,
                    Subgrupo       = subgrupo,
                    Unidad         = unidad,
                    Usaserial      = usaserial,
                    Compuesto      = compuesto,
                    Usaexist       = usaexist,
                    Agrupado       = empaque,
                    Origen         = origen,
                    Costounit      = RoundERP(costoProm * cantidad, dcfg.Total),
                    Preciounit     = preciounitR,
                    Preciofin      = preciounitR,
                    Preciooriginal = preciounitR,
                    Montoneto      = montoneto,
                    Montototal     = totallinea,
                    Timpueprc      = 0,
                    Impuesto1      = impuesto1ln,
                    Impuesto2      = 0,
                    Impuesto4      = 0,
                    Baseimpo1      = 0,
                    Pid            = pid,
                });
            }

            return lineas;
        }

        private static string GenerateNumericId(int length = 12)
        {
            var sb = new System.Text.StringBuilder(length);
            for (int i = 0; i < length; i++) sb.Append(Random.Shared.Next(0, 10));
            return sb.ToString();
        }

        // ── Insert order header (operti) ──────────────────────────────────

        public async Task<bool> InsertOpertiAsync(
            MySqlConnection cn, int newDocumento, List<LineaDetalle> lineas,
            string idvalidacion, string shopifyOrderId, string shopifyOrderNumber,
            DecimalConfig dcfg)
        {
            var clientCmd = new MySqlCommand(@"
                SELECT
                    IFNULL(nombre,    'CONSUMIDOR FINAL') AS nombre,
                    IFNULL(nrorif,    '')  AS nrorif,
                    IFNULL(nronit,    '')  AS nronit,
                    IFNULL(direccion, '')  AS direccion,
                    IFNULL(telefonos, '')  AS telefonos,
                    IFNULL(precio,    1)   AS tipoprecio,
                    IFNULL(dias,      0)   AS diascred,
                    IFNULL(sector,   '6')  AS sector,
                    IFNULL(formafis,  0)   AS formafis
                FROM cliempre WHERE codigo = @codigo LIMIT 1", cn);
            clientCmd.Parameters.AddWithValue("@codigo", _defaultClientCode);

            string nombrecli = "CONSUMIDOR FINAL", rif = "", nit = "",
                   direccion = "", telefonos = "", sector = "6";
            int tipoprecio = _defaultTipoPrecio, diascred = 0, formafis = 0;

            using (var r = await clientCmd.ExecuteReaderAsync())
            {
                if (await r.ReadAsync())
                {
                    nombrecli  = r["nombre"].ToString()    ?? "CONSUMIDOR FINAL";
                    rif        = r["nrorif"].ToString()    ?? "";
                    nit        = r["nronit"].ToString()    ?? "";
                    direccion  = r["direccion"].ToString() ?? "";
                    telefonos  = r["telefonos"].ToString() ?? "";
                    tipoprecio = Convert.ToInt32(r["tipoprecio"]);
                    diascred   = Convert.ToInt32(r["diascred"]);
                    sector     = r["sector"].ToString()    ?? "6";
                    formafis   = Convert.ToInt32(r["formafis"]);
                }
            }

            double totneto      = RoundERP(lineas.Sum(l => l.Montoneto),  dcfg.Total);
            double totcosto     = RoundERP(lineas.Sum(l => l.Costounit),  dcfg.Total);
            double impuesto1Doc = RoundERP(lineas.Sum(l => l.Impuesto1),  dcfg.Impuesto);
            double totalfinal   = dcfg.RedondearTotal
                ? RoundERP(totneto + impuesto1Doc, dcfg.Total)
                : totneto + impuesto1Doc;

            DateTime fechaLocal  = DateTime.Now;
            string fechaEmision  = fechaLocal.ToString("yyyy-MM-dd");
            string horaDocumento = fechaLocal.ToString("hh:mm");
            int    ampm          = fechaLocal.Hour < 12 ? 1 : 2;

            var cmd = new MySqlCommand(@"
                INSERT INTO operti (
                    id_empresa, agencia, moneda, tipodoc, documento,
                    codcliente, nombrecli, rif, nit, direccion, telefonos,
                    tipoprecio, diascred, sector, vendedor,
                    emision, recepcion, vence, fechacrea,
                    totcosto, totbruto, totneto, totimpuest, totalfinal, totdescuen, notas,
                    impuesto1, impuesto2, impuesto3, impuesto4,
                    baseimpo1, baseimpo2, baseimpo3,
                    idvalidacion, uemisor, estacion, al_libro, formafis,
                    horadocum, ampm, almacen, shopify_order_id, orden,
                    sinimpuest, factorcamb, multi_div, escredito, porbackord,
                    fechayhora,
                    comanda_movil, comanda_kmonitor,
                    motanul, xrequest, xresponse
                )
                VALUES (
                    @id_empresa, @agencia, '000', @tipodoc, @documento,
                    @codcliente, @nombrecli, @rif, @nit, @direccion, @telefonos,
                    @tipoprecio, @diascred, @sector, @vendedor,
                    @emision, @emision, @emision, NOW(),
                    @totcosto, @totcosto, @totneto, @totimpuest, @totalfinal, 0, '',
                    @impuesto1, 0, 0, 0,
                    0, 0, 0,
                    @idvalidacion, @uemisor, @estacion, 1, @formafis,
                    @horadocum, @ampm, @almacen, @shopify_order_id, @orden,
                    @totneto, 1, 1, 1, 1,
                    NOW(),
                    0, 0,
                    '', '', ''
                )
                ON DUPLICATE KEY UPDATE
                    totalfinal = VALUES(totalfinal),
                    nombrecli  = VALUES(nombrecli),
                    direccion  = VALUES(direccion);", cn);

            cmd.Parameters.AddWithValue("@id_empresa",        _empresa);
            cmd.Parameters.AddWithValue("@agencia",           _agencia);
            cmd.Parameters.AddWithValue("@tipodoc",           "PED");
            cmd.Parameters.AddWithValue("@documento",         newDocumento.ToString("D8"));
            cmd.Parameters.AddWithValue("@codcliente",        _defaultClientCode);
            cmd.Parameters.AddWithValue("@nombrecli",         nombrecli);
            cmd.Parameters.AddWithValue("@rif",               rif);
            cmd.Parameters.AddWithValue("@nit",               nit);
            cmd.Parameters.AddWithValue("@direccion",         direccion);
            cmd.Parameters.AddWithValue("@telefonos",         telefonos);
            cmd.Parameters.AddWithValue("@tipoprecio",        tipoprecio);
            cmd.Parameters.AddWithValue("@diascred",          diascred);
            cmd.Parameters.AddWithValue("@sector",            sector);
            cmd.Parameters.AddWithValue("@vendedor",          _defaultVendedor);
            cmd.Parameters.AddWithValue("@emision",           fechaEmision);
            cmd.Parameters.AddWithValue("@totcosto",          totcosto);
            cmd.Parameters.AddWithValue("@totneto",           totneto);
            cmd.Parameters.AddWithValue("@totimpuest",        impuesto1Doc);
            cmd.Parameters.AddWithValue("@totalfinal",        totalfinal);
            cmd.Parameters.AddWithValue("@impuesto1",         impuesto1Doc);
            cmd.Parameters.AddWithValue("@idvalidacion",      idvalidacion);
            cmd.Parameters.AddWithValue("@uemisor",           _defaultUemisor);
            cmd.Parameters.AddWithValue("@estacion",          _defaultEstacion);
            cmd.Parameters.AddWithValue("@formafis",          formafis);
            cmd.Parameters.AddWithValue("@horadocum",         horaDocumento);
            cmd.Parameters.AddWithValue("@ampm",              ampm);
            cmd.Parameters.AddWithValue("@almacen",           _almacen);
            cmd.Parameters.AddWithValue("@shopify_order_id",  shopifyOrderId);
            cmd.Parameters.AddWithValue("@orden",
                (shopifyOrderNumber ?? "").Length > 15 ? shopifyOrderNumber[..15] : (shopifyOrderNumber ?? ""));

            int rows = await cmd.ExecuteNonQueryAsync();
            return rows > 0;
        }

        // ── Insert order line (opermv) ────────────────────────────────────

        public async Task InsertOpermvAsync(
            MySqlConnection cn, int newDocumento,
            LineaDetalle linea, string idvalidacion, string shopifyOrderId)
        {
            var cmd = new MySqlCommand(@"
                INSERT INTO opermv (
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
                    idvalidacion, shopify_order_id
                )
                VALUES (
                    @id_empresa, @agencia, @tipodoc, @documento,
                    @grupo, @subgrupo, @origen, @codigo, @nombre,
                    @costounit, @preciounit, @preciounit, @preciounit,
                    @cantidad, @montoneto, @montoneto,
                    @impuesto1, @impuesto2, @impuesto4, @baseimpo1,
                    @unidad, @usaserial, @compuesto, @usaexist, @timpueprc, @agrupado,
                    @proveedor, @vendedor, @tipoprecio, @emisor, @almacen, @estacion,
                    @pid, 1, 1,
                    '',
                    CURDATE(), NOW(),
                    0, 0, 0, '', 0, 0,
                    @idvalidacion, @shopify_order_id
                )
                ON DUPLICATE KEY UPDATE
                    montototal = VALUES(montototal),
                    cantidad   = VALUES(cantidad),
                    preciounit = VALUES(preciounit),
                    preciofin  = VALUES(preciofin),
                    impuesto1  = VALUES(impuesto1),
                    impuesto2  = VALUES(impuesto2),
                    impuesto4  = VALUES(impuesto4),
                    baseimpo1  = VALUES(baseimpo1),
                    fechayhora = VALUES(fechayhora);", cn);

            cmd.Parameters.AddWithValue("@id_empresa",        _empresa);
            cmd.Parameters.AddWithValue("@agencia",           _agencia);
            cmd.Parameters.AddWithValue("@tipodoc",           "PED");
            cmd.Parameters.AddWithValue("@documento",         newDocumento.ToString("D8"));
            cmd.Parameters.AddWithValue("@grupo",             linea.Grupo);
            cmd.Parameters.AddWithValue("@subgrupo",          linea.Subgrupo);
            cmd.Parameters.AddWithValue("@origen",            linea.Origen);
            cmd.Parameters.AddWithValue("@codigo",            linea.Sku);
            cmd.Parameters.AddWithValue("@nombre",            linea.Nombre);
            cmd.Parameters.AddWithValue("@costounit",         linea.Costounit);
            cmd.Parameters.AddWithValue("@preciounit",        linea.Preciounit);
            cmd.Parameters.AddWithValue("@cantidad",          linea.Cantidad);
            cmd.Parameters.AddWithValue("@montoneto",         linea.Montoneto);
            cmd.Parameters.AddWithValue("@impuesto1",         linea.Impuesto1);
            cmd.Parameters.AddWithValue("@impuesto2",         linea.Impuesto2);
            cmd.Parameters.AddWithValue("@impuesto4",         linea.Impuesto4);
            cmd.Parameters.AddWithValue("@baseimpo1",         linea.Baseimpo1);
            cmd.Parameters.AddWithValue("@unidad",            linea.Unidad);
            cmd.Parameters.AddWithValue("@usaserial",         linea.Usaserial);
            cmd.Parameters.AddWithValue("@compuesto",         linea.Compuesto);
            cmd.Parameters.AddWithValue("@usaexist",          linea.Usaexist);
            cmd.Parameters.AddWithValue("@timpueprc",         linea.Timpueprc);
            cmd.Parameters.AddWithValue("@agrupado",          linea.Agrupado);
            cmd.Parameters.AddWithValue("@vendedor",          _defaultVendedor);
            cmd.Parameters.AddWithValue("@tipoprecio",        _defaultTipoPrecio);
            cmd.Parameters.AddWithValue("@emisor",            _defaultUemisor);
            cmd.Parameters.AddWithValue("@almacen",           _almacen);
            cmd.Parameters.AddWithValue("@estacion",          _defaultEstacion);
            cmd.Parameters.AddWithValue("@pid",               linea.Pid);
            cmd.Parameters.AddWithValue("@proveedor",         _defaultClientCode);
            cmd.Parameters.AddWithValue("@idvalidacion",      idvalidacion);
            cmd.Parameters.AddWithValue("@shopify_order_id",  shopifyOrderId);
            await cmd.ExecuteNonQueryAsync();
        }

        // ── PED ↔ Shopify order linking ───────────────────────────────────

        public async Task LinkPedToShopifyOrderAsync(MySqlConnection cn, string documento, string shopifyOrderId)
        {
            foreach (var table in new[] { "operti", "opermv" })
            {
                var cmd = new MySqlCommand(
                    $"UPDATE {table} SET shopify_order_id = @sid WHERE documento = @doc AND id_empresa = @emp AND tipodoc = 'PED'", cn);
                cmd.Parameters.AddWithValue("@sid", shopifyOrderId);
                cmd.Parameters.AddWithValue("@doc", documento);
                cmd.Parameters.AddWithValue("@emp", _empresa);
                await cmd.ExecuteNonQueryAsync();
            }
        }
    }
}
