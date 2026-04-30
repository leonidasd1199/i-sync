using MySql.Data.MySqlClient;
using System.Globalization;

namespace WorkerService1
{
    internal record ShopifyProductEntry(
        long   ProductId,
        long   VariantId,
        long   InventoryItemId,
        int    LastInventory,
        string Grupo,
        string Subgrupo
    );

    internal class ProductCacheRepository
    {
        private readonly string _connectionString;

        public ProductCacheRepository(string connectionString)
            => _connectionString = connectionString;

        // ── shopify_sync_state ────────────────────────────────────────────

        public async Task<DateTime> GetLastOrderSyncAsync()
        {
            await using var cn  = new MySqlConnection(_connectionString);
            await cn.OpenAsync();
            var cmd = new MySqlCommand(
                "SELECT last_order_sync FROM shopify_sync_state WHERE id = 1 LIMIT 1", cn);

            var result = await cmd.ExecuteScalarAsync();
            if (result != null && result != DBNull.Value)
            {
                if (result is DateTime dt)
                    return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                if (DateTime.TryParse(result.ToString(), CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed))
                    return parsed;
            }

            return new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        }

        public async Task SetLastOrderSyncAsync(DateTime utcTimestamp)
        {
            await using var cn  = new MySqlConnection(_connectionString);
            await cn.OpenAsync();
            var cmd = new MySqlCommand(
                "UPDATE shopify_sync_state SET last_order_sync = @ts WHERE id = 1", cn);
            cmd.Parameters.AddWithValue("@ts", utcTimestamp);
            await cmd.ExecuteNonQueryAsync();
        }

        // ── shopify_products ──────────────────────────────────────────────

        public async Task<long> CountAsync()
        {
            await using var cn  = new MySqlConnection(_connectionString);
            await cn.OpenAsync();
            var cmd = new MySqlCommand("SELECT COUNT(*) FROM shopify_products;", cn);
            return Convert.ToInt64(await cmd.ExecuteScalarAsync());
        }

        public async Task<Dictionary<string, ShopifyProductEntry>> GetAllAsync()
        {
            var map = new Dictionary<string, ShopifyProductEntry>(StringComparer.OrdinalIgnoreCase);

            await using var cn  = new MySqlConnection(_connectionString);
            await cn.OpenAsync();
            var cmd = new MySqlCommand(
                "SELECT sku, product_id, variant_id, inventory_item_id, last_inventory, last_grupo, last_subgrupo FROM shopify_products;", cn);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                string sku   = reader.GetString("sku");
                string grupo = reader.IsDBNull(reader.GetOrdinal("last_grupo"))    ? "" : reader.GetString("last_grupo");
                string sub   = reader.IsDBNull(reader.GetOrdinal("last_subgrupo")) ? "" : reader.GetString("last_subgrupo");
                map[sku] = new ShopifyProductEntry(
                    reader.GetInt64("product_id"),
                    reader.GetInt64("variant_id"),
                    reader.GetInt64("inventory_item_id"),
                    reader.GetInt32("last_inventory"),
                    grupo, sub);
            }

            return map;
        }

        public async Task UpsertAsync(MySqlConnection cn, string sku, long productId, long variantId,
            long inventoryItemId, int inventory, string grupo = "", string subgrupo = "")
        {
            var cmd = new MySqlCommand(@"
                INSERT INTO shopify_products
                    (sku, product_id, variant_id, inventory_item_id, last_inventory, last_grupo, last_subgrupo)
                VALUES
                    (@sku, @product_id, @variant_id, @inventory_item_id, @inventory, @grupo, @subgrupo)
                ON DUPLICATE KEY UPDATE
                    product_id        = VALUES(product_id),
                    variant_id        = VALUES(variant_id),
                    inventory_item_id = VALUES(inventory_item_id),
                    last_inventory    = VALUES(last_inventory),
                    last_grupo        = VALUES(last_grupo),
                    last_subgrupo     = VALUES(last_subgrupo);", cn);

            cmd.Parameters.AddWithValue("@sku",               sku);
            cmd.Parameters.AddWithValue("@product_id",        productId);
            cmd.Parameters.AddWithValue("@variant_id",        variantId);
            cmd.Parameters.AddWithValue("@inventory_item_id", inventoryItemId);
            cmd.Parameters.AddWithValue("@inventory",         inventory);
            cmd.Parameters.AddWithValue("@grupo",             grupo);
            cmd.Parameters.AddWithValue("@subgrupo",          subgrupo);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task UpdateGroupAsync(MySqlConnection cn, string sku, string grupo, string subgrupo)
        {
            var cmd = new MySqlCommand(
                "UPDATE shopify_products SET last_grupo = @grupo, last_subgrupo = @subgrupo WHERE sku = @sku;", cn);
            cmd.Parameters.AddWithValue("@grupo",   grupo);
            cmd.Parameters.AddWithValue("@subgrupo", subgrupo);
            cmd.Parameters.AddWithValue("@sku",     sku);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task DeleteAsync(string sku)
        {
            await using var cn  = new MySqlConnection(_connectionString);
            await cn.OpenAsync();
            var cmd = new MySqlCommand("DELETE FROM shopify_products WHERE sku = @sku;", cn);
            cmd.Parameters.AddWithValue("@sku", sku);
            await cmd.ExecuteNonQueryAsync();
        }
    }
}
