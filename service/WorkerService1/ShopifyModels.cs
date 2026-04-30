using Newtonsoft.Json;

namespace WorkerService1
{
    // ── Orders ──────────────────────────────────────────────────────────────

    internal class ShopifyOrdersPage
    {
        [JsonProperty("orders")]
        public List<ShopifyOrder> Orders { get; set; } = [];
    }

    internal class ShopifyOrder
    {
        [JsonProperty("id")]
        public string Id { get; set; } = "";

        [JsonProperty("order_number")]
        public string? OrderNumber { get; set; }

        [JsonProperty("tags")]
        public string Tags { get; set; } = "";

        [JsonProperty("updated_at")]
        public string UpdatedAt { get; set; } = "";

        [JsonProperty("line_items")]
        public List<ShopifyLineItem> LineItems { get; set; } = [];
    }

    internal class ShopifyLineItem
    {
        [JsonProperty("sku")]
        public string Sku { get; set; } = "";

        [JsonProperty("quantity")]
        public int Quantity { get; set; }
    }

    internal class ShopifyCreateOrderResponse
    {
        [JsonProperty("order")]
        public ShopifyCreatedOrderData Order { get; set; } = new();
    }

    internal class ShopifyCreatedOrderData
    {
        [JsonProperty("id")]
        public long Id { get; set; }
    }

    // ── Products ─────────────────────────────────────────────────────────────

    internal class ShopifyProductsPage
    {
        [JsonProperty("products")]
        public List<ShopifyProduct> Products { get; set; } = [];
    }

    internal class ShopifySingleProductResponse
    {
        [JsonProperty("product")]
        public ShopifyProduct Product { get; set; } = new();
    }

    internal class ShopifyProduct
    {
        [JsonProperty("id")]
        public long Id { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; } = "";

        [JsonProperty("variants")]
        public List<ShopifyVariant> Variants { get; set; } = [];
    }

    internal class ShopifyVariant
    {
        [JsonProperty("id")]
        public long Id { get; set; }

        [JsonProperty("product_id")]
        public long ProductId { get; set; }

        [JsonProperty("inventory_item_id")]
        public long InventoryItemId { get; set; }

        [JsonProperty("sku")]
        public string Sku { get; set; } = "";

        [JsonProperty("price")]
        public string Price { get; set; } = "0.00";

        [JsonProperty("inventory_quantity")]
        public int InventoryQuantity { get; set; }

        [JsonProperty("updated_at")]
        public string UpdatedAt { get; set; } = "";
    }

    // ── Smart Collections ────────────────────────────────────────────────────

    internal class ShopifySmartCollectionsPage
    {
        [JsonProperty("smart_collections")]
        public List<ShopifySmartCollection> SmartCollections { get; set; } = [];
    }

    internal class ShopifySmartCollection
    {
        [JsonProperty("id")]
        public long Id { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; } = "";
    }

    // ── Inventory ────────────────────────────────────────────────────────────

    internal class ShopifyInventoryLevelsPage
    {
        [JsonProperty("inventory_levels")]
        public List<ShopifyInventoryLevel> InventoryLevels { get; set; } = [];
    }

    internal class ShopifyInventoryLevel
    {
        [JsonProperty("available")]
        public int Available { get; set; }
    }
}
