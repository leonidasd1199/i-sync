# SpySync — Shopify ↔ ERP Sync Service

A .NET 8 Windows Worker Service that keeps a Shopify storefront in sync with a legacy ERP system in real time.

---

## What it does

- **ERP → Shopify products** — pushes product name, price, tags, and inventory levels on a configurable interval
- **Shopify → ERP orders** — ingests new Shopify orders as PED documents (`operti` / `opermv`) with inventory deduction
- **Smart Collections** — auto-creates Shopify collections from ERP product groups and subgroups
- **ERP PED mirroring** — manually created ERP orders are reflected as Shopify orders (tagged `ERP-MANUAL`) so committed inventory stays accurate on both sides

---

## Screenshots

![Sync cycle console output](docs/console_cycle.png)

![Shopify products](docs/shopify_products.png)

![Product detail](docs/shopify_details.png)

![Smart Collections](docs/shopify_collections.png)

![Store overview](docs/store_details.png)

![Payment summary](docs/store_payment_resume.png)

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | .NET 8 Worker Service (Windows Service) |
| Database | MySQL via `MySql.Data` |
| HTTP client | `HttpClient` with Shopify Admin REST API |
| Serialization | Newtonsoft.Json (typed DTOs) |
| Config | `IOptions<T>` bound from `appsettings.json` |
| Logging | `ILogger<T>` structured logging |

---

## Architecture

SQL is separated from orchestration logic using a repository pattern:

```
Worker.cs                  — main loop, Shopify HTTP calls, cycle scheduling
DbBootstrapService.cs      — schema migrations on startup (tables, columns, SPs)
ProductCacheRepository.cs  — shopify_products cache + order sync bookmark
ErpOrderRepository.cs      — order creation, inventory queries, decimal config
ErpCatalogRepository.cs    — active products, SKU set, groups, unlinked PEDs
ShopifyModels.cs           — typed Shopify API DTOs
ShopifySettings.cs         — strongly-typed configuration model
```

---

## Configuration

Copy `appsettings.json` and fill in your values:

```json
{
  "ShopifySettings": {
    "ConnectionString": "Server=YOUR_HOST;Port=3306;Database=YOUR_DB;Uid=YOUR_USER;Pwd=YOUR_PASSWORD;SslMode=None;",
    "AccessToken": "shpat_YOUR_SHOPIFY_ACCESS_TOKEN",
    "StoreUrl": "your-store.myshopify.com",
    "ApiVersion": "2024-10",
    "LocationId": "YOUR_SHOPIFY_LOCATION_ID",
    "Almacen": "01",
    "Empresa": "YOUR_ERP_EMPRESA",
    "Agencia": "YOUR_ERP_AGENCIA",
    "DbName": "YOUR_DB_NAME",
    "AlertEmails": "your@email.com",
    "SmtpUser": "your@gmail.com",
    "SmtpPass": "your-gmail-app-password",
    "DefaultClientCode": "CLI001",
    "DefaultVendedor": "VEND01",
    "DefaultTipoPrecio": 1,
    "DefaultEstacion": "WEB",
    "DefaultUemisor": "WORKER"
  }
}
```

---

## Build & run

```bash
dotnet restore
dotnet build -c Release
dotnet publish -c Release -o ./publish

# Run as console (for testing)
cd publish
dotnet WorkerService1.dll
```

---

## Install as a Windows Service

From an **elevated** terminal:

```powershell
sc.exe create SpySync binPath="C:\path\to\publish\WorkerService1.exe" start=auto
sc.exe description SpySync "Shopify-ERP real-time sync"
sc.exe start SpySync
```

```powershell
# Uninstall
sc.exe stop SpySync
sc.exe delete SpySync
```

---

## Requirements

- Windows Server 2019+ or Windows 10/11
- [.NET 8 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0)
- MySQL 5.7+ / MariaDB 10.3+
- Shopify Admin API token with `read_products`, `write_products`, `read_orders`, `write_orders`, `read_inventory`, `write_inventory` scopes
