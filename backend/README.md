# Salon Management System — Backend

Node.js + Express + TypeScript API for the Salon Management System.

## Tech stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma (PostgreSQL)
- **Config:** dotenv

## Project structure

```
backend/
├── src/
│   ├── config/          # Environment & database client
│   ├── routes/          # Route definitions
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── validators/      # Request validation (future)
│   ├── utils/           # Shared utilities
│   ├── types/           # TypeScript types
│   ├── app.ts           # Express app factory
│   └── server.ts        # HTTP server entry point
├── prisma/
│   └── schema.prisma    # Prisma schema (datasource only for now)
├── .env                 # Local environment variables (not committed)
├── .env.example         # Environment template
├── package.json
└── tsconfig.json
```

## Getting started

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy the example file and adjust values as needed:

```bash
cp .env.example .env
```

| Variable       | Description                          |
|----------------|--------------------------------------|
| `PORT`         | HTTP port (default: `3000`)          |
| `NODE_ENV`     | `development` or `production`        |
| `DATABASE_URL` | PostgreSQL connection string         |
| `CORS_ORIGIN`  | Allowed frontend origin              |

### 3. Generate Prisma client

```bash
npm run prisma:generate
```

> No database migrations are required at this stage — the schema has no models yet.

### 4. Run the development server

```bash
npm run dev
```

### 5. Verify health check

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "OK",
  "message": "Salon Management Backend Running"
}
```

## Scripts

| Command               | Description                    |
|-----------------------|--------------------------------|
| `npm run dev`         | Start dev server with hot reload |
| `npm run build`       | Compile TypeScript to `dist/`  |
| `npm start`           | Run compiled production build  |
| `npm run prisma:generate` | Generate Prisma client     |

## API endpoints

| Method | Path           | Description   |
|--------|----------------|---------------|
| GET    | `/api/health`  | Service health |

## Next phases

- Prisma models & migrations
- Authentication (JWT)
- Domain modules: customers, appointments, services, finance, inventory
