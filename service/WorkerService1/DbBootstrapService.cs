using Microsoft.Extensions.Logging;
using MySql.Data.MySqlClient;

namespace WorkerService1
{
    /// <summary>
    /// Runs once at startup to ensure the database schema is ready:
    /// tracking tables, auxiliary columns, stored procedures, and functions.
    /// </summary>
    internal class DbBootstrapService
    {
        private readonly string  _connectionString;
        private readonly string  _empresa;
        private readonly string  _agencia;
        private readonly string  _dbName;
        private readonly ILogger _logger;

        public DbBootstrapService(ShopifySettings settings, ILogger logger)
        {
            _connectionString = settings.ConnectionString;
            _empresa          = settings.Empresa;
            _agencia          = settings.Agencia;
            _dbName           = settings.DbName;
            _logger           = logger;
        }

        public async Task RunAsync()
        {
            await EnsureSyncStateTableAsync();
            await EnsureColumnSchemaAsync();
            await EnsureStoredProceduresAsync();
            await EnsureShopifyProductsTableAsync();
            _logger.LogInformation("Database bootstrap complete.");
        }

        // ── Tracking tables ───────────────────────────────────────────────

        private async Task EnsureSyncStateTableAsync()
        {
            const string sql = @"
                CREATE TABLE IF NOT EXISTS shopify_sync_state (
                    id              INT PRIMARY KEY DEFAULT 1,
                    last_order_sync DATETIME NULL
                );
                INSERT IGNORE INTO shopify_sync_state (id, last_order_sync)
                VALUES (1, '1970-01-01');";

            await using var cn  = new MySqlConnection(_connectionString);
            await cn.OpenAsync();
            await using var cmd = new MySqlCommand(sql, cn);
            await cmd.ExecuteNonQueryAsync();
            _logger.LogInformation("Table shopify_sync_state OK.");
        }

        private async Task EnsureShopifyProductsTableAsync()
        {
            const string sql = @"
                CREATE TABLE IF NOT EXISTS shopify_products (
                    sku               VARCHAR(100) NOT NULL PRIMARY KEY,
                    product_id        BIGINT       NOT NULL,
                    variant_id        BIGINT       NOT NULL,
                    inventory_item_id BIGINT       NOT NULL,
                    last_inventory    INT          NOT NULL DEFAULT 0,
                    synced_at         DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

            await using var cn  = new MySqlConnection(_connectionString);
            await cn.OpenAsync();
            await using var cmd = new MySqlCommand(sql, cn);
            await cmd.ExecuteNonQueryAsync();
            _logger.LogInformation("Table shopify_products OK.");
        }

        // ── Auxiliary columns on ERP tables ───────────────────────────────

        private async Task EnsureColumnSchemaAsync()
        {
            await using var cn = new MySqlConnection(_connectionString);
            await cn.OpenAsync();

            await EnsureColumn(cn, "existenc",        "updated_at",            "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            await EnsureColumn(cn, "existenc",        "last_sync_shopify",      "DATETIME NULL");
            await EnsureColumn(cn, "existenc",        "last_synced_to_shopify", "DATETIME NULL");
            await EnsureColumn(cn, "opermv",          "shopify_order_id",       "VARCHAR(50) NULL");
            await EnsureColumn(cn, "operti",          "shopify_order_id",       "VARCHAR(50) NULL");
            await EnsureColumn(cn, "shopify_products","last_grupo",             "VARCHAR(200) NOT NULL DEFAULT ''");
            await EnsureColumn(cn, "shopify_products","last_subgrupo",          "VARCHAR(200) NOT NULL DEFAULT ''");

            _logger.LogInformation("Column schema verified.");
        }

        private async Task EnsureColumn(MySqlConnection cn, string table, string column, string definition)
        {
            var checkCmd = new MySqlCommand($@"
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = '{table}'
                  AND COLUMN_NAME  = '{column}';", cn);

            if (Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0) return;

            await using var alter = new MySqlCommand($"ALTER TABLE {table} ADD COLUMN {column} {definition};", cn);
            await alter.ExecuteNonQueryAsync();
            _logger.LogInformation("Added column {Column} to {Table}.", column, table);
        }

        // ── Stored procedures & functions ─────────────────────────────────

        private async Task EnsureStoredProceduresAsync()
        {
            await using var cn = new MySqlConnection(_connectionString);
            await cn.OpenAsync();

            await EnsureActualizarExistenciaProc(cn);
            await RecreateValidarExistenciaFunc(cn);

            _logger.LogInformation("Stored procedures and functions verified.");
        }

        private static async Task EnsureActualizarExistenciaProc(MySqlConnection cn)
        {
            const string check = @"
                SELECT COUNT(*) FROM information_schema.ROUTINES
                WHERE ROUTINE_SCHEMA = DATABASE()
                  AND ROUTINE_TYPE   = 'PROCEDURE'
                  AND ROUTINE_NAME   = 'ActualizarExistenciaFromShopify';";

            await using var checkCmd = new MySqlCommand(check, cn);
            if (Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0) return;

            const string create = @"
                CREATE PROCEDURE `ActualizarExistenciaFromShopify`(
                    IN p_codigo   VARCHAR(25),
                    IN p_almacen  VARCHAR(2),
                    IN p_cantidad DOUBLE
                )
                BEGIN
                    DECLARE v_exists INT DEFAULT 0;
                    SELECT COUNT(*) INTO v_exists
                    FROM existenc WHERE codigo = p_codigo AND almacen = p_almacen;

                    IF v_exists > 0 THEN
                        UPDATE existenc SET existencia = p_cantidad
                        WHERE codigo = p_codigo AND almacen = p_almacen;
                    ELSE
                        INSERT INTO existenc (codigo, almacen, existencia)
                        VALUES (p_codigo, p_almacen, p_cantidad);
                    END IF;
                END;";

            await using var createCmd = new MySqlCommand(create, cn);
            await createCmd.ExecuteNonQueryAsync();
        }

        private async Task RecreateValidarExistenciaFunc(MySqlConnection cn)
        {
            // DROP + CREATE every startup so the availability formula stays in sync with code.
            await using var drop = new MySqlCommand("DROP FUNCTION IF EXISTS `ValidarExistenciaWeSync`;", cn);
            await drop.ExecuteNonQueryAsync();

            var create = $@"
                CREATE FUNCTION `ValidarExistenciaWeSync`(
                    codigo_producto VARCHAR(25),
                    codigo_almacen  VARCHAR(2)
                ) RETURNS double(20,7)
                BEGIN
                    DECLARE v_existencia   DOUBLE(20,7) DEFAULT 0.0000000;
                    DECLARE v_comprometida DOUBLE(20,7) DEFAULT 0.0000000;

                    SET v_comprometida = (
                        SELECT COALESCE(SUM(mv.cantidad), 0)
                        FROM opermv mv
                        INNER JOIN operti ti
                            ON ti.id_empresa = mv.id_empresa AND ti.agencia   = mv.agencia
                           AND ti.tipodoc    = mv.tipodoc    AND ti.documento = mv.documento
                        WHERE ti.id_empresa = '{_empresa}'  AND ti.agencia    = '{_agencia}'
                          AND ti.tipodoc    = 'PED'
                          AND ti.seimporto  = 0             AND ti.estatusdoc = '0'
                          AND mv.almacen    = codigo_almacen
                          AND mv.codigo     = codigo_producto
                    );

                    IF (codigo_almacen <> '') THEN
                        SET v_existencia = (
                            SELECT COALESCE(SUM(e.existencia), 0) FROM existenc e
                            WHERE e.codigo = codigo_producto AND e.almacen = codigo_almacen
                        );
                    ELSE
                        SET v_existencia = (
                            SELECT COALESCE(SUM(e.existencia), 0) FROM existenc e
                            WHERE e.codigo = codigo_producto
                        );
                    END IF;

                    SET v_existencia = COALESCE(v_existencia, 0) - v_comprometida;
                    IF (v_existencia < 0) THEN SET v_existencia = 0.0000000; END IF;
                    RETURN v_existencia;
                END;";

            await using var createCmd = new MySqlCommand(create, cn);
            await createCmd.ExecuteNonQueryAsync();
        }
    }
}
