using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MySql.Data.MySqlClient;
using Newtonsoft.Json;
using System.Text;
using System.Globalization;
using Microsoft.Extensions.Options;
using System.Net.Mail;

namespace WorkerService1
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker>        _logger;
        private readonly HttpClient             _httpClient;
        // Separate client for internet checks — never carries Shopify credentials.
        private readonly HttpClient             _pingClient;

        private readonly string                 _connectionString;
        private readonly string                 _shopifyStoreUrl;
        private readonly string                 _shopifyApiVersion;
        private readonly string                 _locationId;
        private readonly string                 _alertEmails;
        private readonly string                 _serviceName;
        private readonly string                 _smtpUser;
        private readonly string                 _smtpPass;

        private readonly DbBootstrapService     _dbBootstrap;
        private readonly ProductCacheRepository _productCache;
        private readonly ErpOrderRepository     _orderRepo;
        private readonly ErpCatalogRepository   _catalogRepo;

        private int      _cycleCount          = 0;
        private Task     _orderSyncTask       = Task.CompletedTask;
        private DateTime _lastProductSyncTime = DateTime.MinValue;
        private static readonly TimeSpan ProductSyncInterval = TimeSpan.FromSeconds(30);

        public Worker(ILogger<Worker> logger, IOptions<ShopifySettings> options)
        {
            _logger     = logger;
            _httpClient = new HttpClient();
            _pingClient = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };

            var s = options.Value;
            _connectionString  = s.ConnectionString;
            _shopifyStoreUrl   = s.StoreUrl;
            _shopifyApiVersion = s.ApiVersion;
            _locationId        = s.LocationId;
            _alertEmails       = s.AlertEmails;
            _serviceName       = s.ServiceName;
            _smtpUser          = s.SmtpUser;
            _smtpPass          = s.SmtpPass;

            _dbBootstrap  = new DbBootstrapService(s, logger);
            _productCache = new ProductCacheRepository(_connectionString);
            _orderRepo    = new ErpOrderRepository(s);
            _catalogRepo  = new ErpCatalogRepository(s);

            // Auth header set once — concurrent tasks (order sync + product sync) previously
            // called Clear() + Add() on the shared client, causing race conditions where
            // requests went out without the token.
            _httpClient.DefaultRequestHeaders.Add("X-Shopify-Access-Token", s.AccessToken);

            _logger.LogInformation("Worker initialized. Service={Service}", _serviceName);
        }

        // ── Main loop ─────────────────────────────────────────────────────

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Starting {Service}...", _serviceName);

            if (!await VerifyEnvironmentAsync())
            {
                _logger.LogError("Environment check failed. Stopping service.");
                return;
            }

            try
            {
                await _dbBootstrap.RunAsync();
                await MigrateShopifyProductsToLocalDbIfEmptyAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Startup failed.");
                return;
            }

            _ = Task.Run(() => HeartbeatAsync(stoppingToken), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                if (!await CheckInternetConnectionAsync())
                {
                    _logger.LogWarning("No internet. Retrying in 10s...");
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                    continue;
                }

                try
                {
                    await SyncShopifyOrdersToERP();

                    if (_orderSyncTask.IsCompleted && DateTime.Now - _lastProductSyncTime >= ProductSyncInterval)
                    {
                        _lastProductSyncTime = DateTime.Now;
                        _orderSyncTask = Task.Run(async () =>
                        {
                            try { await SyncProductsToShopifyWithTags(); }
                            catch (Exception ex) { _logger.LogError(ex, "Product sync failed."); }

                            // Archive stale products every 12 cycles (~1 min)
                            if (_cycleCount % 12 == 0)
                            {
                                try { await ArchiveShopifyProductsNotInERP(); }
                                catch (Exception ex) { _logger.LogError(ex, "Archive task failed."); }
                            }

                            // Reconcile local product DB every 60 cycles (~5 min)
                            if (_cycleCount % 60 == 0)
                            {
                                try { await CleanupShopifyDuplicatesAsync(); }
                                catch (Exception ex) { _logger.LogError(ex, "Duplicate cleanup failed."); }
                            }

                            // Sync Smart Collections every 6 cycles (~30 sec)
                            if (_cycleCount % 6 == 0)
                            {
                                try { await SyncGroupSmartCollections(); }
                                catch (Exception ex) { _logger.LogError(ex, "Smart collections sync failed."); }
                            }
                        }, stoppingToken);
                    }

                    _cycleCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Sync cycle failed.");
                }

                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        private async Task HeartbeatAsync(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                _logger.LogInformation("Heartbeat — cycle={Cycle}", _cycleCount);
                await Task.Delay(TimeSpan.FromSeconds(30), token);
            }
        }

        private Task<bool> VerifyEnvironmentAsync()
        {
            bool ok = true;

            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _logger.LogError("Missing ConnectionString.");
                ok = false;
            }
            if (string.IsNullOrWhiteSpace(_shopifyStoreUrl) ||
                string.IsNullOrWhiteSpace(_shopifyApiVersion))
            {
                _logger.LogError("Missing Shopify config (StoreUrl/ApiVersion).");
                ok = false;
            }
            if (string.IsNullOrWhiteSpace(_alertEmails))
            {
                _logger.LogError("Missing AlertEmails setting.");
                ok = false;
            }

            if (ok) _logger.LogInformation("Environment validated.");
            return Task.FromResult(ok);
        }

        // ── Internet check ────────────────────────────────────────────────

        private async Task<bool> CheckInternetConnectionAsync()
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Head, "https://www.google.com");
                var response = await _pingClient.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        // ── Downtime email ────────────────────────────────────────────────

        private async Task SendDowntimeEmailAsync(DateTime downSince, DateTime downUntil)
        {
            try
            {
                var message = new MailMessage
                {
                    From    = new MailAddress(_smtpUser),
                    Subject = $"[{_serviceName}] Notificación de downtime por internet",
                    Body    = $@"
Estimado equipo,

El servicio '{_serviceName}' estuvo desconectado de Internet.

- Desde: {downSince:dd/MM/yyyy HH:mm:ss} UTC
- Hasta: {downUntil:dd/MM/yyyy HH:mm:ss} UTC

Favor revisar conectividad.

Saludos,
Servicio de Monitoreo"
                };

                foreach (var email in _alertEmails.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    message.To.Add(email);

                using var smtp = new SmtpClient("smtp.gmail.com", 587)
                {
                    Credentials = new System.Net.NetworkCredential(_smtpUser, _smtpPass),
                    EnableSsl   = true,
                };

                await smtp.SendMailAsync(message);
                _logger.LogInformation("Downtime email sent to {Recipients}.", _alertEmails);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending downtime email.");
            }
        }

        public async Task SendTestEmailAsync()
        {
            DateTime now = DateTime.UtcNow;
            await SendDowntimeEmailAsync(now.AddMinutes(-5), now);
        }

        // ── Shopify orders → ERP ──────────────────────────────────────────

        private async Task SyncShopifyOrdersToERP()
        {
            try
            {
                await using var cn = new MySqlConnection(_connectionString);
                await cn.OpenAsync();

                DateTime lastSyncUtc = await _productCache.GetLastOrderSyncAsync();
                var      dcfg        = await _orderRepo.GetDecimalConfigAsync(cn);

                string next = $"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/orders.json" +
                              $"?status=any&limit=250&updated_at_min={lastSyncUtc:o}";

                DateTime newestSeen = lastSyncUtc;

                while (!string.IsNullOrEmpty(next))
                {
                    var rsp = await _httpClient.GetAsync(next);
                    if (!rsp.IsSuccessStatusCode)
                    {
                        _logger.LogError("Order pull failed: {Error}", await rsp.Content.ReadAsStringAsync());
                        break;
                    }

                    var body = JsonConvert.DeserializeObject<ShopifyOrdersPage>(await rsp.Content.ReadAsStringAsync())!;

                    foreach (var ord in body.Orders)
                    {
                        try
                        {
                            string shopifyOrderId     = ord.Id;
                            // Human-readable order number (e.g. 1001) — stored without the leading #
                            string shopifyOrderNumber = ord.OrderNumber ?? "";

                            // Skip orders we created to mirror ERP PEDs — avoids a circular loop
                            if (ord.Tags.Contains("ERP-MANUAL", StringComparison.OrdinalIgnoreCase))
                            {
                                _logger.LogDebug("Skipping ERP-MANUAL order {OrderId}.", shopifyOrderId);
                                continue;
                            }

                            if (await _orderRepo.OrderExistsAsync(cn, shopifyOrderId))
                            {
                                _logger.LogDebug("Order {OrderId} already in ERP, skipping.", shopifyOrderId);
                                continue;
                            }

                            bool insufficientStock = false;
                            foreach (var li in ord.LineItems)
                            {
                                double disponible = await _orderRepo.GetAvailableInventoryAsync(cn, li.Sku);
                                if (disponible < li.Quantity)
                                {
                                    insufficientStock = true;
                                    _logger.LogWarning("Insufficient stock for {Sku}: required={Required}, available={Available}.",
                                        li.Sku, li.Quantity, disponible);
                                }
                            }

                            if (insufficientStock)
                            {
                                _logger.LogWarning("Order {OrderId} skipped — insufficient inventory.", shopifyOrderId);
                                continue;
                            }

                            int  newDocumento  = await _orderRepo.GetNextDocumentNumberAsync(cn);
                            var  lineas        = await _orderRepo.PrepararLineasAsync(cn, ord, dcfg);
                            // Shared idvalidacion ties operti header to all opermv lines
                            string idvalidacion = Guid.NewGuid().ToString("N")[..12].ToUpper();

                            await _orderRepo.InsertOpertiAsync(cn, newDocumento, lineas, idvalidacion, shopifyOrderId, shopifyOrderNumber, dcfg);
                            foreach (var linea in lineas)
                                await _orderRepo.InsertOpermvAsync(cn, newDocumento, linea, idvalidacion, shopifyOrderId);

                            _logger.LogInformation("Order {OrderId} → ERP doc {Doc}.", shopifyOrderId, newDocumento.ToString("D8"));
                        }
                        catch (Exception cex)
                        {
                            _logger.LogError(cex, "Failed to process order {OrderId}.", ord.Id);
                        }

                        DateTime orderUtc = ShopifySyncHelpers.ParseShopifyUtc(ord.UpdatedAt);
                        if (orderUtc > newestSeen) newestSeen = orderUtc;
                    }

                    next = ExtractNextPageUrl(rsp.Headers);
                }

                if (newestSeen > lastSyncUtc)
                    await _productCache.SetLastOrderSyncAsync(newestSeen);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Shopify order sync error.");
            }
        }

        // ── ERP → Shopify product sync (tags / price / inventory) ─────────

        private async Task<HttpResponseMessage> ShopifyRequestWithRetry(
            Func<Task<HttpResponseMessage>> requestFunc, string actionDesc, string sku)
        {
            const int maxRetries = 3;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                var response = await requestFunc();
                if (response.IsSuccessStatusCode) return response;

                int status = (int)response.StatusCode;
                if (status == 429 || status >= 500)
                {
                    var retryMs = response.Headers.RetryAfter?.Delta?.TotalMilliseconds ?? 2000;
                    _logger.LogWarning("Shopify retry {Attempt}/{Max} for {Sku} ({Action}) after {Ms}ms.",
                        attempt, maxRetries, sku, actionDesc, retryMs);
                    await Task.Delay((int)retryMs);
                }
                else
                {
                    _logger.LogError("Shopify request failed for {Action} (SKU={Sku}): {Error}",
                        actionDesc, sku, await response.Content.ReadAsStringAsync());
                    return response;
                }
            }

            _logger.LogError("Shopify request permanently failed for {Action} (SKU={Sku}) after {Max} attempts.",
                actionDesc, sku, maxRetries);
            return new HttpResponseMessage(System.Net.HttpStatusCode.TooManyRequests);
        }

        private async Task SyncProductsToShopifyWithTags()
        {
            try
            {
                var shopifyProducts = await _productCache.GetAllAsync();

                await using var cn = new MySqlConnection(_connectionString);
                await cn.OpenAsync();

                _logger.LogInformation("Starting ERP → Shopify sync...");
                var erpProducts = await _catalogRepo.GetActiveProductsAsync(cn);
                _logger.LogInformation("{Count} ERP products to sync.", erpProducts.Count);

                int updated = 0;

                // Pass 1: push price/title/tags for products whose ERP metadata changed
                foreach (var p in erpProducts)
                {
                    string sku = p.Codigo;
                    if (!shopifyProducts.TryGetValue(sku, out var entry)) continue;

                    bool groupChanged = !string.Equals(entry.Grupo,    p.Grupo    ?? "", StringComparison.Ordinal)
                                     || !string.Equals(entry.Subgrupo, p.Subgrupo ?? "", StringComparison.Ordinal);

                    if (!p.MetadataChanged && !groupChanged) continue;

                    string tag          = p.Subgrupo ?? "";
                    string vendor       = string.IsNullOrEmpty(p.Marca)    ? "SIN_MARCA" : p.Marca;
                    string productType  = string.IsNullOrEmpty(p.Grupo)    ? ""           : p.Grupo;

                    var updatePayload = new
                    {
                        product = new
                        {
                            id           = entry.ProductId,
                            title        = p.Nombre,
                            body_html    = "",
                            vendor,
                            product_type = productType,
                            tags         = tag,
                            status       = "active",
                            variants     = new[]
                            {
                                new
                                {
                                    id    = entry.VariantId,
                                    price = p.Precio.ToString("0.00", CultureInfo.InvariantCulture)
                                }
                            }
                        }
                    };

                    var updateContent  = new StringContent(JsonConvert.SerializeObject(updatePayload), Encoding.UTF8, "application/json");
                    var updateResponse = await ShopifyRequestWithRetry(() =>
                        _httpClient.PutAsync($"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products/{entry.ProductId}.json", updateContent),
                        "Update Product", sku);
                    await Task.Delay(500);
                    if (!updateResponse.IsSuccessStatusCode) continue;

                    var mfBeneficio = new
                    {
                        metafield = new
                        {
                            @namespace = "custom", key = "beneficio_efectivo",
                            value      = p.PrecioBase.ToString("0.00", CultureInfo.InvariantCulture),
                            type       = "number_decimal"
                        }
                    };
                    await ShopifyRequestWithRetry(() =>
                        _httpClient.PostAsync($"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products/{entry.ProductId}/metafields.json",
                            new StringContent(JsonConvert.SerializeObject(mfBeneficio), Encoding.UTF8, "application/json")),
                        "Update Metafield beneficio_efectivo", sku);
                    await Task.Delay(500);

                    if (!string.IsNullOrWhiteSpace(p.Unidad))
                    {
                        var mfUnidad = new
                        {
                            metafield = new
                            {
                                @namespace = "custom", key = "unidad_de_medida",
                                value      = p.Unidad,
                                type       = "single_line_text_field"
                            }
                        };
                        await ShopifyRequestWithRetry(() =>
                            _httpClient.PostAsync($"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products/{entry.ProductId}/metafields.json",
                                new StringContent(JsonConvert.SerializeObject(mfUnidad), Encoding.UTF8, "application/json")),
                            "Update Metafield unidad_de_medida", sku);
                        await Task.Delay(500);
                    }

                    await _orderRepo.MarkInventorySyncedAsync(cn, sku, p.Existencia,
                        p.FechaModifi == DateTime.MinValue ? null : p.FechaModifi);
                    await _productCache.UpdateGroupAsync(cn, sku, p.Grupo ?? "", p.Subgrupo ?? "");
                    updated++;
                }

                _logger.LogInformation("Metadata pass complete. Updated={Count}.", updated);

                // Pass 2: inventory deltas + create missing products
                foreach (var p in erpProducts)
                {
                    string sku         = p.Codigo;
                    string tag         = p.Subgrupo ?? "";
                    string vendor      = string.IsNullOrEmpty(p.Marca) ? "SIN_MARCA" : p.Marca;
                    string productType = string.IsNullOrEmpty(p.Grupo) ? ""           : p.Grupo;

                    if (shopifyProducts.TryGetValue(sku, out var entry))
                    {
                        int newInventory = (int)Math.Floor(p.Existencia);
                        if (newInventory == entry.LastInventory) continue;

                        var invPayload = new
                        {
                            location_id       = _locationId,
                            inventory_item_id = entry.InventoryItemId,
                            available         = newInventory
                        };
                        var invResponse = await ShopifyRequestWithRetry(() =>
                            _httpClient.PostAsync($"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/inventory_levels/set.json",
                                new StringContent(JsonConvert.SerializeObject(invPayload), Encoding.UTF8, "application/json")),
                            "Update Inventory", sku);
                        await Task.Delay(500);

                        if (invResponse.IsSuccessStatusCode)
                            await _productCache.UpsertAsync(cn, sku, entry.ProductId, entry.VariantId, entry.InventoryItemId, newInventory);
                    }
                    else
                    {
                        // SKU not in local cache → create new Shopify product
                        var newProductPayload = new
                        {
                            product = new
                            {
                                title        = p.Nombre,
                                body_html    = "",
                                vendor,
                                product_type = productType,
                                tags         = tag,
                                status       = "active",
                                variants     = new[]
                                {
                                    new
                                    {
                                        option1              = "Default",
                                        price                = p.Precio.ToString("0.00", CultureInfo.InvariantCulture),
                                        sku,
                                        inventory_management = "shopify",
                                        inventory_quantity   = (int)Math.Floor(p.Existencia)
                                    }
                                }
                            }
                        };

                        var createResponse = await ShopifyRequestWithRetry(() =>
                            _httpClient.PostAsync($"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products.json",
                                new StringContent(JsonConvert.SerializeObject(newProductPayload), Encoding.UTF8, "application/json")),
                            "Create Product", sku);

                        if (!createResponse.IsSuccessStatusCode) continue;

                        var createBody      = JsonConvert.DeserializeObject<ShopifySingleProductResponse>(await createResponse.Content.ReadAsStringAsync())!;
                        long newProductId   = createBody.Product.Id;
                        long newVariantId   = createBody.Product.Variants[0].Id;
                        long newInvItemId   = createBody.Product.Variants[0].InventoryItemId;
                        int  createdInv     = (int)Math.Floor(p.Existencia);

                        // Save immediately — prevents duplicate creation on the next cycle
                        await _productCache.UpsertAsync(cn, sku, newProductId, newVariantId, newInvItemId,
                            createdInv, p.Grupo ?? "", p.Subgrupo ?? "");
                        shopifyProducts[sku] = new ShopifyProductEntry(
                            newProductId, newVariantId, newInvItemId, createdInv, p.Grupo ?? "", p.Subgrupo ?? "");

                        var mfBeneficio = new { metafield = new { @namespace = "custom", key = "beneficio_efectivo", value = p.PrecioBase.ToString("0.00", CultureInfo.InvariantCulture), type = "number_decimal" } };
                        await ShopifyRequestWithRetry(() =>
                            _httpClient.PostAsync($"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products/{newProductId}/metafields.json",
                                new StringContent(JsonConvert.SerializeObject(mfBeneficio), Encoding.UTF8, "application/json")),
                            "Create Metafield beneficio_efectivo", sku);

                        if (!string.IsNullOrWhiteSpace(p.Unidad))
                        {
                            var mfUnidad = new { metafield = new { @namespace = "custom", key = "unidad_de_medida", value = p.Unidad, type = "single_line_text_field" } };
                            await ShopifyRequestWithRetry(() =>
                                _httpClient.PostAsync($"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products/{newProductId}/metafields.json",
                                    new StringContent(JsonConvert.SerializeObject(mfUnidad), Encoding.UTF8, "application/json")),
                                "Create Metafield unidad_de_medida", sku);
                        }

                        await _orderRepo.MarkInventorySyncedAsync(cn, sku, p.Existencia,
                            p.FechaModifi == DateTime.MinValue ? null : p.FechaModifi);

                        _logger.LogInformation("Created Shopify product: SKU={Sku} ProductId={ProductId}.", sku, newProductId);
                    }
                }

                // Pass 3: draft products removed from ERP
                var validSkus = new HashSet<string>(erpProducts.Select(p => p.Codigo), StringComparer.OrdinalIgnoreCase);
                int drafted = 0;
                foreach (var kvp in shopifyProducts)
                {
                    if (validSkus.Contains(kvp.Key)) continue;

                    var draftResponse = await _httpClient.PutAsync(
                        $"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products/{kvp.Value.ProductId}.json",
                        new StringContent(JsonConvert.SerializeObject(new { product = new { id = kvp.Value.ProductId, status = "draft" } }),
                            Encoding.UTF8, "application/json"));

                    if (draftResponse.IsSuccessStatusCode) drafted++;
                    else _logger.LogWarning("Failed to draft {Sku}: {Error}", kvp.Key, await draftResponse.Content.ReadAsStringAsync());

                    await Task.Delay(500);
                }

                if (drafted > 0) _logger.LogInformation("Drafted {Count} products removed from ERP.", drafted);
                _logger.LogInformation("ERP → Shopify sync complete.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during product sync.");
            }
        }

        private async Task<double> GetShopifyStock(long inventoryItemId)
        {
            var response = await _httpClient.GetAsync(
                $"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/inventory_levels.json?inventory_item_ids={inventoryItemId}");
            if (!response.IsSuccessStatusCode) return -1;

            var data = JsonConvert.DeserializeObject<ShopifyInventoryLevelsPage>(await response.Content.ReadAsStringAsync())!;
            return data.InventoryLevels.Count > 0 ? (double)data.InventoryLevels[0].Available : 0;
        }

        private async Task ArchiveShopifyProductsNotInERP()
        {
            try
            {
                await using var cn = new MySqlConnection(_connectionString);
                await cn.OpenAsync();

                var erpSkus      = await _catalogRepo.GetActiveSkusAsync(cn);
                var localProducts = await _productCache.GetAllAsync();

                int archivedCount = 0;
                foreach (var kvp in localProducts)
                {
                    if (erpSkus.Contains(kvp.Key)) continue;

                    var response = await _httpClient.PutAsync(
                        $"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products/{kvp.Value.ProductId}.json",
                        new StringContent(
                            JsonConvert.SerializeObject(new { product = new { id = kvp.Value.ProductId, status = "draft" } }),
                            Encoding.UTF8, "application/json"));

                    if (!response.IsSuccessStatusCode)
                        _logger.LogWarning("Failed to draft {Sku}: {Error}", kvp.Key, await response.Content.ReadAsStringAsync());
                    else
                        archivedCount++;

                    await Task.Delay(600);
                }

                _logger.LogInformation("Archive pass done. Drafted={Archived}, ERP={Erp}, LocalCache={Local}.",
                    archivedCount, erpSkus.Count, localProducts.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while archiving Shopify products.");
            }
        }

        // ── Group Smart Collections ───────────────────────────────────────

        private async Task SyncGroupSmartCollections()
        {
            try
            {
                await using var cn = new MySqlConnection(_connectionString);
                await cn.OpenAsync();

                var grupos           = await _catalogRepo.GetGruposAndSubgruposAsync(cn);
                var existingRaw      = await GetExistingSmartCollections();
                var existingNorm     = existingRaw.ToDictionary(
                    kvp => kvp.Key.Trim().ToUpperInvariant(), kvp => kvp.Value);

                int createdCount = 0;

                foreach (var (groupName, subgroups) in grupos)
                {
                    string trimmedGroup = groupName.Trim();

                    if (!existingNorm.ContainsKey(trimmedGroup.ToUpperInvariant()))
                    {
                        var payload = new
                        {
                            smart_collection = new
                            {
                                title      = trimmedGroup,
                                rules      = new[] { new { column = "type", relation = "equals", condition = trimmedGroup } },
                                disjunctive = false,
                                published  = true
                            }
                        };

                        var response = await _httpClient.PostAsync(
                            $"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/smart_collections.json",
                            new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"));

                        if (response.IsSuccessStatusCode) createdCount++;
                        else _logger.LogWarning("Failed to create group collection '{Group}': {Error}",
                            trimmedGroup, await response.Content.ReadAsStringAsync());

                        await Task.Delay(TimeSpan.FromSeconds(1));
                    }

                    foreach (var subName in subgroups)
                    {
                        string trimmedSub = subName.Trim();
                        if (existingNorm.ContainsKey(trimmedSub.ToUpperInvariant())) continue;

                        var payload = new
                        {
                            smart_collection = new
                            {
                                title = trimmedSub,
                                rules = new[]
                                {
                                    new { column = "type", relation = "equals", condition = trimmedGroup },
                                    new { column = "tag",  relation = "equals", condition = trimmedSub  }
                                },
                                disjunctive = false,
                                published   = true
                            }
                        };

                        var response = await _httpClient.PostAsync(
                            $"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/smart_collections.json",
                            new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"));

                        if (response.IsSuccessStatusCode) createdCount++;
                        else _logger.LogWarning("Failed to create subgroup collection '{Sub}': {Error}",
                            trimmedSub, await response.Content.ReadAsStringAsync());

                        await Task.Delay(TimeSpan.FromSeconds(1));
                    }
                }

                if (createdCount > 0)
                    _logger.LogInformation("Smart collections created: {Count}.", createdCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Smart Collections sync.");
            }
        }

        private async Task<Dictionary<string, string>> GetExistingSmartCollections()
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string? url = $"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/smart_collections.json?limit=250";

            while (!string.IsNullOrEmpty(url))
            {
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) break;

                var page = JsonConvert.DeserializeObject<ShopifySmartCollectionsPage>(await response.Content.ReadAsStringAsync())!;
                foreach (var c in page.SmartCollections)
                    if (!string.IsNullOrWhiteSpace(c.Title))
                        map[c.Title] = c.Id.ToString();

                url = ExtractNextPageUrl(response.Headers);
                await Task.Delay(300);
            }

            return map;
        }

        // ── Manual ERP PEDs → Shopify orders ─────────────────────────────

        private async Task SyncManualERPPedsToShopify()
        {
            try
            {
                await using var cn = new MySqlConnection(_connectionString);
                await cn.OpenAsync();

                var pedGroups = await _catalogRepo.GetUnlinkedPedsAsync(cn);
                if (pedGroups.Count == 0) return;

                _logger.LogInformation("{Count} manual PED(s) without a Shopify order — creating...", pedGroups.Count);

                var shopifyMap = await GetShopifyProductMapBySku(_shopifyStoreUrl, _shopifyApiVersion);

                foreach (var (documento, lineas) in pedGroups)
                {
                    var lineItems = new List<object>();
                    foreach (var linea in lineas)
                    {
                        if (shopifyMap.TryGetValue(linea.Codigo, out var info))
                            lineItems.Add(new { variant_id = info.VariantId, quantity = linea.Cantidad,
                                price = linea.Precio.ToString("0.00", CultureInfo.InvariantCulture) });
                        else
                            _logger.LogWarning("SKU {Sku} not found in Shopify (PED {Doc}).", linea.Codigo, documento);
                    }

                    if (lineItems.Count == 0) continue;

                    var orderPayload = new
                    {
                        order = new
                        {
                            line_items               = lineItems,
                            financial_status         = "pending",
                            tags                     = "ERP-MANUAL",
                            note                     = $"Pedido creado en ERP. Documento: {documento}",
                            send_receipt             = false,
                            send_fulfillment_receipt = false,
                            inventory_behaviour      = "bypass"
                        }
                    };

                    var response = await ShopifyRequestWithRetry(() =>
                        _httpClient.PostAsync($"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/orders.json",
                            new StringContent(JsonConvert.SerializeObject(orderPayload), Encoding.UTF8, "application/json")),
                        "Create Manual PED Order", documento);

                    if (response.IsSuccessStatusCode)
                    {
                        var body          = JsonConvert.DeserializeObject<ShopifyCreateOrderResponse>(await response.Content.ReadAsStringAsync())!;
                        string shopifyId  = body.Order.Id.ToString();
                        await _orderRepo.LinkPedToShopifyOrderAsync(cn, documento, shopifyId);
                        _logger.LogInformation("Shopify order {OrderId} created for ERP PED {Doc} [ERP-MANUAL].", shopifyId, documento);
                    }
                    else
                    {
                        _logger.LogError("Failed to create Shopify order for PED {Doc}: {Error}",
                            documento, await response.Content.ReadAsStringAsync());
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SyncManualERPPedsToShopify.");
            }
        }

        // ── Shopify → ERP inventory sync ──────────────────────────────────

        private async Task SyncShopifyToERP()
        {
            try
            {
                await using var cn = new MySqlConnection(_connectionString);
                await cn.OpenAsync();

                var shopifyProducts = await GetShopifyProductMapBySku(_shopifyStoreUrl, _shopifyApiVersion);
                _logger.LogInformation("Syncing Shopify inventory back to ERP...");

                foreach (var (sku, info) in shopifyProducts)
                {
                    DateTime? lastSynced = await _orderRepo.GetInventoryTimestampAsync(cn, sku);
                    bool shouldUpdate = lastSynced == null || info.UpdatedAt > lastSynced.Value;

                    if (shouldUpdate)
                        await _orderRepo.UpdateInventoryFromShopifyAsync(cn, sku, info.Quantity);
                }

                _logger.LogInformation("Shopify → ERP inventory sync complete.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during ERP inventory update from Shopify.");
            }
        }

        // ── Local product cache management ────────────────────────────────

        private async Task MigrateShopifyProductsToLocalDbIfEmptyAsync()
        {
            if (await _productCache.CountAsync() > 0)
            {
                _logger.LogInformation("shopify_products already populated — skipping migration.");
                return;
            }

            _logger.LogInformation("shopify_products is empty — seeding from Shopify API (one-time)...");
            var map = await GetShopifyProductMapBySku(_shopifyStoreUrl, _shopifyApiVersion);

            await using var cn = new MySqlConnection(_connectionString);
            await cn.OpenAsync();

            foreach (var (sku, info) in map)
                await _productCache.UpsertAsync(cn, sku, info.ProductId, info.VariantId, info.InventoryItemId, info.Quantity);

            _logger.LogInformation("Seed complete: {Count} products saved to shopify_products.", map.Count);
        }

        private async Task CleanupShopifyDuplicatesAsync()
        {
            _logger.LogInformation("Reconciling local product cache with Shopify...");
            var map = await GetShopifyProductMapBySku(_shopifyStoreUrl, _shopifyApiVersion);

            await using var cn = new MySqlConnection(_connectionString);
            await cn.OpenAsync();

            foreach (var (sku, info) in map)
                await _productCache.UpsertAsync(cn, sku, info.ProductId, info.VariantId, info.InventoryItemId, info.Quantity);

            _logger.LogInformation("Local cache reconciled: {Count} products.", map.Count);
        }

        // ── Shopify product map (full API scan) ───────────────────────────

        private async Task<Dictionary<string, (long VariantId, long InventoryItemId, long ProductId, string Title, int Quantity, decimal Price, DateTime UpdatedAt)>>
            GetShopifyProductMapBySku(string store, string version)
        {
            var map                = new Dictionary<string, (long VariantId, long InventoryItemId, long ProductId, string Title, int Quantity, decimal Price, DateTime UpdatedAt)>(StringComparer.OrdinalIgnoreCase);
            var duplicatesToDelete = new List<long>();
            string? nextUrl        = $"https://{store}/admin/api/{version}/products.json?limit=250&status=any";

            while (!string.IsNullOrEmpty(nextUrl))
            {
                HttpResponseMessage response = null!;
                bool pageOk = false;
                for (int attempt = 1; attempt <= 5; attempt++)
                {
                    response = await _httpClient.GetAsync(nextUrl);
                    if (response.IsSuccessStatusCode) { pageOk = true; break; }

                    int status = (int)response.StatusCode;
                    if (status == 429 || status >= 500)
                    {
                        var retryMs = response.Headers.RetryAfter?.Delta?.TotalMilliseconds ?? (2000 * attempt);
                        _logger.LogWarning("GetShopifyProductMap retry {Attempt}/5 (HTTP {Status}) — waiting {Ms}ms.", attempt, status, retryMs);
                        await Task.Delay((int)retryMs);
                    }
                    else
                    {
                        _logger.LogError("Failed to fetch Shopify products (HTTP {Status}): {Error}",
                            status, await response.Content.ReadAsStringAsync());
                        break;
                    }
                }

                if (!pageOk)
                {
                    _logger.LogError("Giving up on Shopify product page after retries. Map may be incomplete ({Count} so far).", map.Count);
                    break;
                }

                var page = JsonConvert.DeserializeObject<ShopifyProductsPage>(await response.Content.ReadAsStringAsync())!;

                foreach (var product in page.Products)
                {
                    foreach (var variant in product.Variants)
                    {
                        string sku = variant.Sku?.Trim() ?? "";
                        if (string.IsNullOrWhiteSpace(sku)) continue;

                        if (!DateTimeOffset.TryParse(variant.UpdatedAt, CultureInfo.InvariantCulture, DateTimeStyles.None, out var updatedAtOffset))
                            continue;

                        long    variantId  = variant.Id;
                        long    invItemId  = variant.InventoryItemId;
                        long    productId  = variant.ProductId;
                        int     quantity   = variant.InventoryQuantity;
                        decimal price      = decimal.TryParse(variant.Price, NumberStyles.Any, CultureInfo.InvariantCulture, out var p) ? p : 0m;
                        DateTime updatedAt = updatedAtOffset.UtcDateTime;

                        if (map.TryGetValue(sku, out var existing))
                        {
                            // Keep the newer product (higher ID); archive the older duplicate
                            long archiveId = Math.Min(productId, existing.ProductId);
                            duplicatesToDelete.Add(archiveId);
                            _logger.LogWarning("Duplicate SKU={Sku}: keeping {Keep}, archiving {Archive}.",
                                sku, Math.Max(productId, existing.ProductId), archiveId);
                            if (productId > existing.ProductId)
                                map[sku] = (variantId, invItemId, productId, product.Title, quantity, price, updatedAt);
                        }
                        else
                        {
                            map[sku] = (variantId, invItemId, productId, product.Title, quantity, price, updatedAt);
                        }
                    }
                }

                nextUrl = ExtractNextPageUrl(response.Headers);
                await Task.Delay(300);
            }

            foreach (var dupId in duplicatesToDelete)
            {
                var deleteResponse = await _httpClient.DeleteAsync(
                    $"https://{_shopifyStoreUrl}/admin/api/{_shopifyApiVersion}/products/{dupId}.json");
                if (deleteResponse.IsSuccessStatusCode)
                    _logger.LogInformation("Deleted duplicate product ID={ProductId}.", dupId);
                else
                    _logger.LogWarning("Failed to delete duplicate ID={ProductId}: {Error}",
                        dupId, await deleteResponse.Content.ReadAsStringAsync());
                await Task.Delay(500);
            }

            return map;
        }

        // ── Pagination helper ─────────────────────────────────────────────

        private string? ExtractNextPageUrl(System.Net.Http.Headers.HttpResponseHeaders headers)
        {
            if (!headers.TryGetValues("Link", out var values)) return null;

            var linkHeader = values.FirstOrDefault();
            if (linkHeader == null) return null;

            foreach (var link in linkHeader.Split(','))
            {
                var parts = link.Split(';');
                if (parts.Length == 2 && parts[1].Trim().Equals("rel=\"next\"", StringComparison.OrdinalIgnoreCase))
                    return parts[0].Trim().Trim('<', '>');
            }

            return null;
        }
    }
}
