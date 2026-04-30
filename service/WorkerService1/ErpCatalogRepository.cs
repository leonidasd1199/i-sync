using MySql.Data.MySqlClient;
using System.Globalization;

namespace WorkerService1
{
    internal record ErpProduct(
        string   Codigo,
        string   Nombre,
        decimal  Precio,
        decimal  PrecioBase,
        string   Marca,
        string   Grupo,
        string   Subgrupo,
        double   Existencia,
        string   Unidad,
        bool     MetadataChanged,
        DateTime FechaModifi
    );

    internal record PedLine(string Codigo, int Cantidad, double Precio);

    internal class ErpCatalogRepository
    {
        private readonly string _connectionString;
        private readonly string _empresa;
        private readonly string _agencia;
        private readonly string _almacen;
        private readonly int    _defaultTipoPrecio;

        public ErpCatalogRepository(ShopifySettings s)
        {
            _connectionString  = s.ConnectionString;
            _empresa           = s.Empresa;
            _agencia           = s.Agencia;
            _almacen           = s.Almacen;
            _defaultTipoPrecio = s.DefaultTipoPrecio;
        }

        // ── Active product catalog (ERP → Shopify sync) ───────────────────

        public async Task<List<ErpProduct>> GetActiveProductsAsync(MySqlConnection cn)
        {
            string precioCol    = $"preciofin{_defaultTipoPrecio}";
            var cmd = new MySqlCommand($@"
                SELECT
                    TRIM(a.codigo) AS codigo,
                    a.nombre,
                    a.{precioCol},
                    IFNULL(a.preciofin1, 0) AS preciofin1,
                    IFNULL(a.marca, '') AS marca,
                    a.unidad,
                    g.nombre  AS grupo_nombre,
                    sg.nombre AS subgrupo_nombre,
                    ValidarExistenciaWeSync(TRIM(a.codigo), @almacen) AS existencia,
                    NULLIF(a.fechamodifi, '0000-00-00 00:00:00') AS fechamodifi,
                    NULLIF(e.last_synced_to_shopify, '0000-00-00 00:00:00') AS last_synced_to_shopify
                FROM articulo a
                LEFT JOIN grupos g
                    ON g.codigo = a.grupo
                LEFT JOIN subgrupos sg
                    ON sg.subcodigo = a.subgrupo AND sg.codigo = a.grupo
                LEFT JOIN existenc e
                    ON e.codigo = a.codigo AND e.almacen = @almacen
                WHERE a.nousaweb = 0 AND a.usointerno = 0 AND a.discont = 0
                ORDER BY a.codigo;", cn);
            cmd.Parameters.AddWithValue("@almacen", _almacen);

            var result = new List<ErpProduct>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                string codigo = reader.GetString(reader.GetOrdinal("codigo"));
                string nombre = reader.GetString(reader.GetOrdinal("nombre"));
                decimal precio     = reader.IsDBNull(reader.GetOrdinal(precioCol))    ? 0m : reader.GetDecimal(reader.GetOrdinal(precioCol));
                decimal precioBase = reader.IsDBNull(reader.GetOrdinal("preciofin1")) ? 0m : reader.GetDecimal(reader.GetOrdinal("preciofin1"));
                string marca    = reader.IsDBNull(reader.GetOrdinal("marca"))           ? "" : reader.GetString(reader.GetOrdinal("marca"));
                string unidad   = reader.IsDBNull(reader.GetOrdinal("unidad"))          ? "" : reader.GetString(reader.GetOrdinal("unidad"));
                string grupo    = reader.IsDBNull(reader.GetOrdinal("grupo_nombre"))    ? "" : reader.GetString(reader.GetOrdinal("grupo_nombre"));
                string subgrupo = reader.IsDBNull(reader.GetOrdinal("subgrupo_nombre")) ? "" : reader.GetString(reader.GetOrdinal("subgrupo_nombre"));
                double existencia    = reader.IsDBNull(reader.GetOrdinal("existencia"))    ? 0  : reader.GetDouble(reader.GetOrdinal("existencia"));
                DateTime fechaModifi = reader.IsDBNull(reader.GetOrdinal("fechamodifi"))   ? DateTime.MinValue : reader.GetDateTime(reader.GetOrdinal("fechamodifi"));
                DateTime? lastSynced = reader.IsDBNull(reader.GetOrdinal("last_synced_to_shopify")) ? null : reader.GetDateTime(reader.GetOrdinal("last_synced_to_shopify"));
                bool metadataChanged = lastSynced == null || fechaModifi > lastSynced.Value;

                result.Add(new ErpProduct(codigo, nombre, precio, precioBase, marca, grupo, subgrupo,
                    existencia, unidad, metadataChanged, fechaModifi));
            }

            return result;
        }

        // ── Active SKU set (archive pass) ─────────────────────────────────

        public async Task<HashSet<string>> GetActiveSkusAsync(MySqlConnection cn)
        {
            var skus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var cmd  = new MySqlCommand(
                "SELECT codigo FROM articulo WHERE nousaweb = 0 AND usointerno = 0 AND discont = 0", cn);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                skus.Add(reader.GetString(reader.GetOrdinal("codigo")).Trim());
            return skus;
        }

        // ── Groups / subgroups (smart collections) ────────────────────────

        public async Task<Dictionary<string, HashSet<string>>> GetGruposAndSubgruposAsync(MySqlConnection cn)
        {
            var grupos = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
            var cmd    = new MySqlCommand(@"
                SELECT g.nombre AS grupo, sg.nombre AS subgrupo
                FROM grupos g
                LEFT JOIN subgrupos sg ON sg.codigo = g.codigo
                WHERE TRIM(g.nombre) <> ''
                ORDER BY g.codigo;", cn);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                string groupName = reader.GetString(reader.GetOrdinal("grupo"))?.Trim() ?? "";
                string subName   = reader.IsDBNull(reader.GetOrdinal("subgrupo")) ? "" : reader.GetString(reader.GetOrdinal("subgrupo"))?.Trim() ?? "";
                if (string.IsNullOrEmpty(groupName)) continue;

                if (!grupos.TryGetValue(groupName, out var set))
                {
                    set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    grupos[groupName] = set;
                }
                if (!string.IsNullOrEmpty(subName))
                    set.Add(subName);
            }

            return grupos;
        }

        // ── Unlinked PEDs (ERP → Shopify manual order sync) ──────────────

        public async Task<Dictionary<string, List<PedLine>>> GetUnlinkedPedsAsync(MySqlConnection cn)
        {
            var groups = new Dictionary<string, List<PedLine>>();
            var cmd    = new MySqlCommand(@"
                SELECT t.documento, m.codigo, m.cantidad, m.preciofin AS precio
                FROM operti t
                JOIN opermv m ON m.documento = t.documento
                    AND m.id_empresa = t.id_empresa AND m.tipodoc = t.tipodoc
                WHERE t.tipodoc    = 'PED'
                  AND t.id_empresa = @empresa
                  AND t.agencia    = @agencia
                  AND (t.shopify_order_id IS NULL OR TRIM(t.shopify_order_id) = '')
                  AND t.seimporto  = 0
                  AND t.estatusdoc = '0'
                ORDER BY t.documento", cn);
            cmd.Parameters.AddWithValue("@empresa", _empresa);
            cmd.Parameters.AddWithValue("@agencia", _agencia);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                string doc     = reader.GetString(reader.GetOrdinal("documento"));
                string codigo  = reader.GetString(reader.GetOrdinal("codigo")).Trim();
                int    cantidad = (int)reader.GetDouble(reader.GetOrdinal("cantidad"));
                double precio  = reader.GetDouble(reader.GetOrdinal("precio"));
                if (!groups.TryGetValue(doc, out var list))
                {
                    list = new List<PedLine>();
                    groups[doc] = list;
                }
                list.Add(new PedLine(codigo, cantidad, precio));
            }

            return groups;
        }
    }
}
