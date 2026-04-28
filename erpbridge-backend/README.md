# ERPBridge — Backend

NestJS REST API that connects the ordering platform to a MySQL ERP database.

## Setup

```bash
cp .env.example .env   # fill in your values
npm install
npm run start:dev
```

Swagger docs: `http://localhost:3001/docs` (development only)

## Tests

```bash
npm run test          # unit tests
npm run test:cov      # with coverage report
```

## Modules

| Module | Responsibility |
|---|---|
| `auth` | JWT login, first-login setup, password reset via email |
| `articulos` | Product catalog with ERP pricing and live stock |
| `carrito` | Cart persistence with version-based sync |
| `pedidos` | Order creation, batch DB inserts, PDF generation, email |
| `cliente` | Client master data from ERP |
| `empresa` | Company configuration |
| `agencias` | Agency configuration |
| `images` | Serve product images from ERP filesystem paths |
| `health` | Health check endpoint |

See the [root README](../README.md) for full project context.
