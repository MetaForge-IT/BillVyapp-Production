# MySQL connection pool (production)

BillVyapp uses **Prisma** with the MySQL driver. Pool size and timeouts are configured via query parameters on `DATABASE_URL` (not separate env vars).

## Recommended production URL

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/new_salon_app?connection_limit=10&pool_timeout=20&connect_timeout=10"
```

| Parameter | Suggested value | Purpose |
|-----------|-----------------|--------|
| `connection_limit` | `10` per API instance | Max connections Prisma opens to MySQL. With 2 app containers, plan for ~20 DB connections total. |
| `pool_timeout` | `20` (seconds) | How long a request waits for a free connection before erroring. |
| `connect_timeout` | `10` (seconds) | TCP handshake timeout to RDS/MySQL. |

## Sizing guide

- **Single EC2 / one Node process:** `connection_limit=10` is a safe default.
- **Multiple replicas:** `connection_limit = floor((max_connections - 20) / number_of_app_instances)`.
  - Example: RDS `max_connections=150`, 3 API instances → ~40 each max, but use **10–15** to leave headroom for admin, migrations, and replicas.
- **With Redis + BullMQ workers on the same host:** keep API pool modest (8–12); workers use their own Prisma clients if added later.

## RDS / MySQL server

Ensure the instance allows enough connections:

```sql
SHOW VARIABLES LIKE 'max_connections';
```

For a small salon SaaS deployment, `max_connections` ≥ 100 is usually sufficient.

## Operations checklist

1. Set `DATABASE_URL` with pool params in production `.env` (see `backend/.env.prod.example`).
2. After changing pool settings, **restart** the API process (pool is created at startup).
3. Monitor slow queries and connection errors (`Too many connections`, Prisma `P2024`).
4. Do **not** run `prisma migrate reset` on production.

## Related env vars

| Variable | Role |
|----------|------|
| `DATABASE_URL` | MySQL connection string + pool query params |
| `REDIS_URL` | Optional cache / queues (reduces repeated heavy reads) |

## Example `.env.prod` snippet

```env
DATABASE_URL="mysql://salon_app:URL_ENCODED_PASSWORD@your-rds-endpoint.ap-south-1.rds.amazonaws.com:3306/new_salon_app?connection_limit=10&pool_timeout=20&connect_timeout=10"
```

URL-encode special characters in the password (`@`, `#`, `%`, etc.).
