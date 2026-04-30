# ERPWorker - Shopify ↔ ERP Sync Service

Servicio de Windows (.NET 8 Worker Service) que sincroniza:
- **Productos ERP → Shopify** (nombre, precio, tags, inventario)
- **Órdenes Shopify → ERP** (PED en operti/opermv con descuento de existencia)
- **Smart Collections** (grupos/subgrupos → colecciones automáticas)

---

## Requisitos

- Windows Server 2019+ (o Windows 10/11)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- MySQL 5.7+ / MariaDB 10.3+ accesible
- Shopify Admin API access token con permisos de productos, inventario y órdenes

---

## Configuración

Editar `appsettings.json` con los datos reales:

```json
{
  "ShopifySettings": {
    "ConnectionString": "Server=TU_IP;Port=3306;Database=admin001000;Uid=TU_USER;Pwd=TU_PASSWORD;SslMode=None;",
    "AccessToken": "shpat_TU_TOKEN_REAL",
    "StoreUrl": "tu-tienda.myshopify.com",
    "ApiVersion": "2024-10",
    "LocationId": "TU_LOCATION_ID",
    "Almacen": "01",
    "AlertEmails": "correo@dominio.com",
    "ServiceName": "ERPWorker",
    "DefaultClientCode": "CLI001",
    "DefaultVendedor": "VEND01",
    "DefaultTipoPrecio": 1,
    "DefaultEstacion": "01"
  }
}
```

---

## Compilar

```bash
cd WorkerService1
dotnet restore
dotnet build -c Release
dotnet publish -c Release -o ./publish
```

---

## Ejecutar como consola (para pruebas)

```bash
cd publish
dotnet WorkerService1.dll
```

---

## Instalar como Servicio de Windows

Desde una terminal **Administrador (CMD o PowerShell)**:

```powershell
sc.exe create ERPWorker binPath="C:\ruta\completa\publish\WorkerService1.exe" start=auto
sc.exe description ERPWorker "Sincronización ERP-Shopify"
sc.exe start ERPWorker
```

### Desinstalar servicio

```powershell
sc.exe stop ERPWorker
sc.exe delete ERPWorker
```

---

## Estructura del proyecto

```
WorkerService1/
├── WorkerService1.csproj    # Proyecto .NET 8 Worker
├── Program.cs               # Entry point + DI + Windows Service config
├── Worker.cs                # Lógica principal del servicio (sync loop)
├── ShopifySettings.cs       # Modelo de configuración (IOptions)
├── ShopifySyncHelpers.cs    # Helpers estáticos (sync state, inventario, fechas)
├── appsettings.json         # Configuración (editar con datos reales)
└── README.md                # Este archivo
```

---

## Notas importantes

- El servicio crea automáticamente la tabla `shopify_sync_state` y las columnas auxiliares en la BD al iniciar.
- El stored procedure `ActualizarExistenciaFromShopify` y la función `ValidarExistenciaWeSync` se crean automáticamente si no existen.
- El ciclo de sync corre cada **5 segundos**.
- Hay un heartbeat en consola cada **30 segundos** para confirmar que el servicio está vivo.
- Si se pierde internet, reintenta cada 10 segundos.
- Las credenciales SMTP para alertas de downtime están hardcodeadas en Worker.cs — cambiarlas según necesidad.
