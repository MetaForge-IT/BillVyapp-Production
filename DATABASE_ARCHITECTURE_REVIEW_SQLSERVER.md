# Salon Management System — Database Architecture Review (SQL Server)

> **Document type:** Pre-implementation architecture review  
> **Platform:** Microsoft SQL Server 2019+ (Standard or Enterprise)  
> **ORM (planned):** Prisma  
> **Design baseline:** `DATABASE_DESIGN_V1.md`  
> **Date:** 2026-07-01  
> **Reviewer role:** Senior Database Architect  

---

## Executive summary

The V1 logical model is **sound, normalized, and aligned with the frontend**. Before implementation on SQL Server, apply the recommendations in this review to avoid common pitfalls: **UUID clustered-index fragmentation**, **weak concurrency on billing/inventory counters**, **polymorphic FK gaps**, **circular appointment↔invoice references**, and **missing audit/filtered-index patterns**.

### Top 10 changes before build

| # | Change | Impact |
|---|--------|--------|
| 1 | Adopt **hybrid PK strategy** (see §2) | Insert performance, index health |
| 2 | Add `rowversion` on `products`, `salon_financial_settings`, `customers` (loyalty) | Concurrency safety |
| 3 | Replace polymorphic `reference_id` with typed nullable FKs on `stock_movements` | Referential integrity |
| 4 | Break `appointments` ↔ `invoices` circular FK | Clean migration order |
| 5 | Use **filtered unique indexes** for soft-delete uniqueness | Data quality |
| 6 | Add `created_by` / `updated_by` on mutable business tables | Audit compliance |
| 7 | Map enums to **`TINYINT` + lookup tables** (not CHECK-only) | Prisma + reporting |
| 8 | Use **`DECIMAL(12,2)`** for all money; never `FLOAT` | Financial accuracy |
| 9 | Plan **partitioning/archive** for `stock_movements`, `loyalty_transactions`, `notifications` | Long-term scale |
| 10 | Use **SQL Server SEQUENCE** for receipt numbers (not app-only counter) | Race-free numbering |

---

## 1. Normalization review (3NF / BCNF)

### Compliant areas (keep as-is)

| Area | Assessment |
|------|------------|
| Customer master vs preferences | **3NF** — `customer_preferences` correctly separates optional 1:1 attributes |
| Package ↔ services | **BCNF** — junction table `package_services` eliminates M:N redundancy |
| Invoice header vs line items | **3NF** — amounts at line level; header holds rollups only |
| Membership tier catalog vs enrollment | **3NF** — `membership_tiers` vs `customer_memberships` history |
| Loyalty ledger | **3NF** — append-only transactions; balance on customer is denormalized cache |

### Intentional denormalization (documented exceptions)

| Column(s) | Table | Justification | Risk mitigation |
|-----------|-------|---------------|-----------------|
| `loyalty_points`, `total_visits`, `total_spend`, `avg_satisfaction` | `customers` | CRM list performance | Update in same transaction as invoice/feedback; nightly reconciliation job |
| `used_count` | `coupons` | Coupon dashboard | Increment in redemption transaction |
| `status` | `products` | UI stock badge | Recompute on stock change or computed column (see below) |
| `item_name`, `unit_price` | `invoice_line_items`, `appointment_services` | Immutable billing snapshot | Never UPDATE after insert |
| `current_tier_id` | `customers` | Fast tier display | Sync when `customer_memberships` changes |

### Normalization improvements recommended

| Issue | Recommendation |
|-------|----------------|
| `products.category` as free text | V1: keep VARCHAR; V2: FK to `product_categories` lookup table |
| `stock_movements.reference_type` + `reference_id` | Replace with `invoice_id`, `appointment_id`, `purchase_order_id` nullable FKs (only one non-null) + CHECK constraint |
| `notifications.reference_type` + `reference_id` | Same pattern, or drop polymorphic FK (V1 in-app only) |
| `customer_preferences` 1:1 could merge into `customers` | **Keep separate** — cleaner NULL profile, smaller hot row for customer search |

### BCNF note on `package_services`

Composite PK `(package_id, service_id)` is correct. Add `UNIQUE` constraint preventing duplicate service lines if business requires quantity-only merges.

---

## 2. Primary key strategy (SQL Server)

### Problem with original design

Random **UUID v4 as CLUSTERED primary key** on SQL Server causes **index fragmentation** and **buffer pool churn** on high-insert tables (`invoices`, `stock_movements`, `loyalty_transactions`, `notifications`).

### Recommended hybrid strategy

| Table category | Clustered PK | External / API key | Default |
|----------------|--------------|-------------------|---------|
| **Master / catalog** (low churn) | `UNIQUEIDENTIFIER` | Same column | `NEWSEQUENTIALID()` |
| **Transactional / ledger** (high insert) | `BIGINT IDENTITY(1,1)` | `UNIQUEIDENTIFIER NOT NULL UNIQUE` (`public_id`) | `NEWSEQUENTIALID()` on GUID |
| **Junction** | Composite clustered on FK columns | N/A | — |

### Table classification

**GUID clustered (`NEWSEQUENTIALID()`):**  
`salons`, `users`, `business_hours`, `salon_financial_settings`, `salon_notification_settings`, `customers`, `customer_preferences`, `membership_tiers`, `service_categories`, `services`, `packages`, `products`, `vendors`, `coupons`, `appointments`, `purchase_orders`

**BIGINT identity clustered + GUID `public_id`:**  
`invoices`, `invoice_line_items`, `payments`, `appointment_services`, `stock_movements`, `loyalty_transactions`, `coupon_redemptions`, `purchase_order_items`, `notifications`, `feedback`, `refresh_tokens`, `password_reset_tokens`, `customer_memberships`

**Composite clustered:**  
`package_services` → `CLUSTERED (package_id, service_id)`

### Prisma compatibility

Prisma supports `@id @default(autoincrement())` and `@default(dbgenerated("NEWSEQUENTIALID()"))` on SQL Server. Expose **`public_id`** to the API layer; keep `id` BIGINT internal for joins on ledger tables if desired, or use GUID everywhere in Prisma with **nonclustered PK** + **clustered index on `(salon_id, created_at)`** as alternative.

### Alternative (simpler Prisma model)

If team prefers single key type: use **`UNIQUEIDENTIFIER` NONCLUSTERED PK** + **`CLUSTERED INDEX ON (salon_id, created_at DESC)`** for all transactional tables. Acceptable for V1 volume (&lt; 10M rows/table).

---

## 3. Foreign key relationships — global rules

### Cascade policy matrix

| Parent → Child | ON DELETE | ON UPDATE | Rationale |
|----------------|-----------|-----------|-----------|
| `salons` → tenant children | **NO ACTION** | CASCADE on `salon_id` only if ever re-keyed (unlikely) | Never delete salon in production |
| `customers` → `appointments` | **NO ACTION** | NO ACTION | Preserve history; deactivate customer instead |
| `customers` → `invoices` | **NO ACTION** | NO ACTION | Financial records immutable |
| `customers` → `customer_preferences` | **CASCADE** | NO ACTION | Preferences die with customer (soft delete parent) |
| `appointments` → `appointment_services` | **CASCADE** | NO ACTION | Lines are part of appointment |
| `invoices` → `invoice_line_items`, `payments` | **NO ACTION** | NO ACTION | Void invoice, don't delete |
| `invoices` → `coupon_redemptions` | **NO ACTION** | NO ACTION | Audit trail |
| `packages` → `package_services` | **CASCADE** | NO ACTION | Junction cleanup |
| `users` → `refresh_tokens`, `password_reset_tokens` | **CASCADE** | NO ACTION | Token cleanup |
| `products` → `stock_movements` | **NO ACTION** | NO ACTION | Ledger never deleted |
| `vendors` → `products.vendor_id` | **SET NULL** | NO ACTION | Vendor soft-delete |
| `membership_tiers` → `customers.current_tier_id` | **SET NULL** | NO ACTION | Tier deactivation |

### Circular reference fix

**Current issue:** `appointments.invoice_id` → `invoices` AND `invoices.appointment_id` → `appointments`.

**Recommendation:**
- Keep **`invoices.appointment_id`** FK → `appointments` (bill knows source booking).
- **Remove** `appointments.invoice_id` FK; replace with **nullable `invoice_id` without FK** or resolve via query `SELECT id FROM invoices WHERE appointment_id = @apptId`.
- Alternatively: keep both but create `appointments` first, then `invoices`, then `UPDATE appointments SET invoice_id` without FK constraint (not ideal).

**Preferred:** single direction `invoices.appointment_id` only.

---

## 4. Unique constraints

| Table | Constraint | Notes |
|-------|------------|-------|
| `business_hours` | `UNIQUE (salon_id, day_of_week)` | |
| `users` | `UNIQUE (salon_id, email)` | |
| `users` | `UNIQUE (email)` filtered `WHERE is_active = 1` | Global login uniqueness V1 |
| `customers` | `UNIQUE (salon_id, phone)` **filtered** `WHERE deleted_at IS NULL` | Allow reuse after soft delete |
| `customers` | `UNIQUE (salon_id, email)` filtered `WHERE email IS NOT NULL AND deleted_at IS NULL` | |
| `membership_tiers` | `UNIQUE (salon_id, slug)` | |
| `service_categories` | `UNIQUE (salon_id, name)` | |
| `products` | `UNIQUE (salon_id, sku)` filtered `WHERE deleted_at IS NULL` | |
| `vendors` | `UNIQUE (salon_id, name)` filtered `WHERE deleted_at IS NULL` | |
| `coupons` | `UNIQUE (salon_id, code)` filtered `WHERE deleted_at IS NULL` | Case-insensitive: use computed column `code_upper` |
| `invoices` | `UNIQUE (salon_id, receipt_number)` | |
| `purchase_orders` | `UNIQUE (salon_id, po_number)` | |
| `customer_preferences` | `UNIQUE (customer_id)` | 1:1 |
| `salon_financial_settings` | `UNIQUE (salon_id)` | 1:1 |
| `salon_notification_settings` | `UNIQUE (salon_id)` | 1:1 |
| `coupon_redemptions` | `UNIQUE (invoice_id, coupon_id)` | One coupon per bill |
| `package_services` | `PRIMARY KEY (package_id, service_id)` | |

---

## 5. Check constraints

| Table | Constraint |
|-------|------------|
| `business_hours` | `day_of_week BETWEEN 0 AND 6` |
| `business_hours` | `is_closed = 1 OR (open_time IS NOT NULL AND close_time IS NOT NULL)` |
| `customers` | `loyalty_points >= 0` |
| `customers` | `total_visits >= 0`, `total_spend >= 0` |
| `products` | `stock_qty >= 0`, `min_stock_qty >= 0`, `retail_price >= 0`, `cost_price >= 0` |
| `coupons` | `value > 0`; percentage type: `value <= 100` |
| `coupons` | `valid_till >= valid_from` |
| `appointment_services` | `(service_id IS NOT NULL OR package_id IS NOT NULL OR item_name IS NOT NULL)` |
| `invoice_line_items` | Exactly one of `service_id`, `product_id`, `package_id` matches `line_type` |
| `invoice_line_items` | `quantity > 0`, `unit_price >= 0`, `line_total >= 0` |
| `payments` | `amount > 0` |
| `loyalty_transactions` | `points <> 0` |
| `feedback` | `rating BETWEEN 1 AND 5` |
| `purchase_order_items` | `quantity_ordered > 0`, `quantity_received >= 0`, `quantity_received <= quantity_ordered` |
| `stock_movements` | `stock_before >= 0 AND stock_after >= 0` (business rule) |
| `salon_financial_settings` | `default_gst_rate BETWEEN 0 AND 100` |
| `appointments` | `duration_minutes > 0` |
| `invoices` | `total_amount >= 0`, `subtotal >= 0` |

---

## 6. Default values (SQL Server)

| Column pattern | Default |
|----------------|---------|
| `created_at`, `updated_at` | `SYSUTCDATETIME()` |
| `is_active`, `is_read` | `0` / `1` as appropriate (`BIT`) |
| `status` columns | Lowest-risk initial state (`pending`, `active`, `draft`) |
| `loyalty_points`, counters | `0` |
| `currency` | `'INR'` |
| `timezone` | `'Asia/Kolkata'` |
| `round_off_mode` | `'none'` |
| `receipt_prefix` | `'RCP'` |
| GUID PKs | `NEWSEQUENTIALID()` |

---

## 7. Required vs optional columns

**Rule:** All FKs to `salons` are **NOT NULL** on tenant tables. `branch_id` **NULL** in V1.

| Always required | Often optional | Nullable by design |
|---------------|----------------|-------------------|
| `salon_id`, `created_at` | `email`, `address`, `notes` | `branch_id` |
| Customer `phone`, `full_name` | `gstin`, `date_of_birth` | `deleted_at` |
| Appointment `scheduled_date/time` | `staff_name`, `notes` | `invoice` link (until billed) |
| Invoice `receipt_number`, `total_amount` | `appointment_id` | `voided_at` |
| Product `sku`, `name`, prices | `vendor_id`, `brand` | `last_restocked_at` |

---

## 8. Audit columns

### Standard audit block (mutable business tables)

| Column | Type | Notes |
|--------|------|-------|
| `created_at` | `DATETIME2(3)` | `NOT NULL DEFAULT SYSUTCDATETIME()` |
| `updated_at` | `DATETIME2(3)` | `NOT NULL`; app or trigger updates |
| `created_by` | `UNIQUEIDENTIFIER NULL` | FK → `users.id`; NULL = system seed |
| `updated_by` | `UNIQUEIDENTIFIER NULL` | FK → `users.id` |
| `rowversion` | `ROWVERSION` | Optimistic concurrency (selected tables) |

### Tables requiring full audit + `rowversion`

`customers`, `products`, `appointments`, `invoices`, `salon_financial_settings`, `services`, `coupons`, `purchase_orders`

### Append-only tables (created_at only)

`stock_movements`, `loyalty_transactions`, `payments`, `coupon_redemptions`, `refresh_tokens`, `password_reset_tokens`, `notifications` (update `read_at` only)

### Future: `audit_events` table (V2)

`(id, salon_id, user_id, entity_type, entity_id, action, old_values_json, new_values_json, created_at)` — not required V1 but reserve in architecture docs.

---

## 9. Soft delete strategy

### Tables with soft delete

`customers`, `services`, `products`, `vendors`, `coupons`

### Column pattern

| Column | Type |
|--------|------|
| `deleted_at` | `DATETIME2(3) NULL` |
| `deleted_by` | `UNIQUEIDENTIFIER NULL` FK → `users` |

### Rules

1. **Never hard-delete** rows referenced by `invoices`, `appointments`, or `loyalty_transactions`.
2. All list queries default to `WHERE deleted_at IS NULL`.
3. **Filtered unique indexes** enforce phone/sku/code uniqueness among active rows only.
4. `status = 'inactive'` on customers is **orthogonal** to soft delete (inactive = business state; deleted = removed from UI).

### Tables that must NOT soft-delete

`invoices`, `payments`, `stock_movements`, `loyalty_transactions` — use `voided_at` / reversing entries instead.

---

## 10. Indexing strategy (SQL Server)

### Principles

1. **One clustered index per table** — choose insert-order-friendly key.
2. **Nonclustered indexes** for search/filter paths; avoid over-indexing write-heavy ledgers.
3. **Filtered indexes** for partial predicates (`deleted_at IS NULL`, `is_read = 0`, `status IN (...)`).
4. **Covering indexes** with `INCLUDE` for hot list queries (avoid key lookups).
5. **Fill factor** 90–95 on volatile indexes; 100 on static catalog tables.
6. Rebuild/reorganize via SQL Agent maintenance jobs weekly.

### Enum / lookup storage

Create schema `ref` with lookup tables (`ref.appointment_status`, etc.) or use `TINYINT` + CHECK. **Recommend lookup tables** for SQL Server reporting and SSRS compatibility.

---

## 11. Query optimization recommendations

| Pattern | Recommendation |
|---------|----------------|
| Customer search by phone | `UNIQUE` index on normalized phone; store `phone_normalized` computed column (digits only) |
| Calendar day view | `WHERE salon_id = @id AND scheduled_date = @d AND status NOT IN ('cancelled')` — use composite index |
| Finance date range | `WHERE salon_id = @id AND invoice_date BETWEEN @s AND @e` — clustered or NC on `(salon_id, invoice_date DESC)` |
| Low stock report | Filtered index `WHERE stock_qty <= min_stock_qty AND deleted_at IS NULL` |
| Unread notifications | Filtered `(salon_id, created_at DESC) WHERE is_read = 0` |
| Loyalty history | `(customer_id, created_at DESC)` INCLUDE `(type, points, balance_after)` |
| Avoid `SELECT *` | List endpoints project only needed columns |
| Pagination | `ORDER BY created_at DESC OFFSET/FETCH` or keyset pagination on `(created_at, id)` |
| Aggregates | Use denormalized customer counters; refresh via transaction not trigger chains |

---

## 12. Frequently searched columns (global)

| Column | Tables | Search type |
|--------|--------|-------------|
| `phone`, `phone_normalized` | `customers` | Exact, POS |
| `full_name` | `customers` | LIKE / full-text V2 |
| `email` | `customers`, `users` | Exact |
| `sku`, `name` | `products` | Exact / prefix |
| `receipt_number` | `invoices` | Exact |
| `scheduled_date`, `status` | `appointments` | Range + filter |
| `code` | `coupons` | Exact (case-insensitive) |
| `name` | `services`, `vendors` | Prefix |
| `is_read` | `notifications` | Filter |
| `created_at` | All ledgers | Range, sort |

**V2:** Add SQL Server **Full-Text Index** on `customers.full_name`, `services.name`, `products.name`.

---

## 13. Transaction boundaries

| Business operation | Tables in one transaction | Isolation |
|------------------|---------------------------|-----------|
| Complete sale (POS) | `invoices`, `invoice_line_items`, `payments`, `coupon_redemptions`, `customers` (stats), `loyalty_transactions`, `products` (stock), `stock_movements` | `SERIALIZABLE` or `REPEATABLE READ` for stock decrement |
| Book appointment | `appointments`, `appointment_services` | `READ COMMITTED` |
| Cancel appointment | `appointments` (status), optional `notifications` | `READ COMMITTED` |
| Adjust stock | `products`, `stock_movements` | `REPEATABLE READ` + `rowversion` check |
| Redeem loyalty points | `customers`, `loyalty_transactions` | `SERIALIZABLE` |
| Issue receipt number | `salon_financial_settings` or `SEQUENCE` | Atomic `NEXT VALUE FOR` |

**Rule:** One user-facing business action = one transaction. No cross-request open transactions.

---

## 14. Concurrency handling

| Hot resource | Mechanism |
|--------------|-----------|
| `products.stock_qty` | `rowversion` optimistic lock; retry on conflict |
| `customers.loyalty_points` | Update with `WHERE rowversion = @rv`; ledger append in same txn |
| `salon_financial_settings.next_receipt_sequence` | **Replace with SQL Server `SEQUENCE`** `seq_receipt_{salon_id}` or single `NEXT VALUE FOR seq_receipt` per salon |
| Appointment slot double-booking | V1 single manager low risk; V2: unique index on `(salon_id, scheduled_date, scheduled_time, staff_name)` filtered active statuses |
| Receipt number uniqueness | `UNIQUE (salon_id, receipt_number)` + sequence |

---

## 15. SQL Server performance recommendations

| Area | Recommendation |
|------|----------------|
| Edition | Standard sufficient V1; Enterprise if partitioning &gt; 50M rows |
| Collation | `SQL_Latin1_General_CP1_CI_AS` or `Latin1_General_100_CI_AS` — case-insensitive search |
| TempDB | Multiple data files (1 per CPU up to 8) on fast SSD |
| Data files | Pre-size data/log files; avoid autogrowth spikes during bulk import |
| Statistics | `AUTO_UPDATE_STATISTICS_ASYNC ON` for OLTP |
| Parameterization | `PARAMETERIZATION FORCED` only if needed; default OFF |
| JSON | `benefits` on tiers: `NVARCHAR(MAX)` + `ISJSON` check, or normalized `tier_benefits` table |
| Computed columns | `stock_status` PERSISTED from `stock_qty`/`min_stock_qty` — index for low-stock |
| MaxDOP | 4–8 for mixed workload on dedicated server |
| Connection pooling | App pool via Prisma; max pool 50–100 |

---

## 16. Large table strategy

### Expected growth (5-year, busy salon)

| Table | Est. rows | Growth rate |
|-------|-----------|-------------|
| `stock_movements` | High | Every sale/adjustment |
| `loyalty_transactions` | High | Every bill |
| `notifications` | Medium | System events |
| `invoices` / line items | Medium | Daily sales |
| `appointments` | Medium | Daily bookings |
| `feedback` | Low–medium | |
| Catalog tables | Low | Static |

### Strategies

1. **Clustered index on insert key** (`created_at` or `IDENTITY`) for sequential inserts.
2. **Partitioning (Enterprise):** `stock_movements`, `invoices` by **month** on `created_at` / `invoice_date` when &gt; 10M rows.
3. **Archive tables** (see §17) before partitioning required on Standard edition.
4. Avoid wide NVARCHAR(MAX) in clustered index keys.

---

## 17. Archive strategy

| Source table | Archive trigger | Archive table |
|--------------|-----------------|---------------|
| `notifications` | `created_at` &gt; 90 days AND `is_read = 1` | `notifications_archive` |
| `stock_movements` | `created_at` &gt; 2 years | `stock_movements_archive` |
| `invoices` | `invoice_date` &gt; 7 years (tax retention India) | `invoices_archive` + line items |
| `refresh_tokens` | `expires_at` &lt; now | Delete (not archive) |
| `password_reset_tokens` | `used_at` set or expired | Delete |

**Process:** Monthly SQL Agent job — `INSERT INTO archive SELECT ... DELETE` in batches with `TOP (5000)` loops to avoid log explosion.

---

## 18. Backup and recovery

| Item | Recommendation |
|------|----------------|
| Model | **FULL** recovery model (production) |
| Full backup | Nightly 02:00 local time |
| Differential | Every 6 hours during business hours |
| Log backup | Every 15–30 minutes |
| Retention | 30 days on-site; copy to Azure Blob / S3 |
| `CHECKDB` | Weekly `DBCC CHECKDB` with `PHYSICAL_ONLY` mid-week |
| RTO / RPO | RPO 30 min (log shipping); RTO 1–4 hours |
| Dev/Test | Weekly restore drill to validate backups |
| Encryption | TDE (Transparent Data Encryption) for production |

---

## 19. Naming conventions

| Object | Convention | Example |
|--------|------------|---------|
| Schema | `dbo` (default), `ref` (lookups), `arc` (archive) | `ref.appointment_status` |
| Tables | `snake_case`, plural | `invoice_line_items` |
| PK | `PK_<table>` | `PK_customers` |
| FK | `FK_<child>_<parent>_<column>` | `FK_appointments_customers_customer_id` |
| Unique | `UQ_<table>_<columns>` | `UQ_customers_salon_phone_active` |
| Check | `CK_<table>_<rule>` | `CK_feedback_rating_range` |
| Index | `IX_<table>_<columns>` | `IX_appointments_salon_date_status` |
| Filtered index | suffix `_filtered` | `IX_customers_phone_active_filtered` |
| Default | `DF_<table>_<column>` | `DF_customers_created_at` |
| Sequence | `seq_<purpose>_<salon>` | `seq_receipt_salon` |

---

## 20. Security recommendations

| Area | Recommendation |
|------|----------------|
| App login | Dedicated `salon_app_user` — `db_datareader`, `db_datawriter`, `EXECUTE` on schema; **not** `db_owner` |
| Migrations | Separate `salon_migration_user` used only in CI/CD |
| No SA | Application never uses `sa` |
| Row-level security | V2: `salon_id` predicate on all tenant tables when multi-tenant |
| Sensitive columns | `password_hash`, `token_hash` — never log; consider Always Encrypted V2 |
| Dynamic SQL | Prohibit in app; parameterized queries via Prisma |
| Audit | SQL Server Audit for DDL changes; app-level `audit_events` V2 |
| Network | SQL Server not public; private VPC / VPN only |

---

## 21. Scalability (future versions)

| Version | Schema addition |
|---------|-----------------|
| Multi-branch | `branches` table; populate `branch_id`; branch-scoped unique indexes |
| Multi-user | `roles`, `user_roles`; `created_by` enforcement |
| Employees | `employees`; replace `staff_name` with `employee_id` FK |
| Read replicas | Route reporting queries to **read-only secondary** |
| Sharding | Shard key = `salon_id` when SaaS multi-tenant at scale |
| Event outbox | `outbox_events` for email/SMS integration |

---

## 22. Per-table recommendations

Legend: **PK** = primary key strategy | **FK** = notable foreign keys | **IX** = indexes | **CC** = check constraints | **Perf** = performance notes

---

### `salons`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered, `DEFAULT NEWSEQUENTIALID()` |
| **FK** | None (root) |
| **IX** | `UNIQUE (email)` |
| **Audit** | `created_at`, `updated_at`, `rowversion` |
| **Soft delete** | No — use `is_active = 0` |
| **Frequent queries** | `WHERE id = @salonId` (single row V1) |
| **Perf** | Tiny table; always in memory |

---

### `business_hours`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` → `salons` ON DELETE NO ACTION |
| **IX** | `UNIQUE CLUSTERED (salon_id, day_of_week)` — consider composite clustered |
| **CC** | `day_of_week` 0–6; closed/open time logic |
| **Audit** | `created_at`, `updated_at` |
| **Queries** | `WHERE salon_id = @id` (7 rows) |

---

### `users`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` → `salons` |
| **IX** | `UNIQUE (email) WHERE is_active = 1`; `IX (salon_id)` |
| **CC** | `role` in lookup table |
| **Audit** | Full + `last_login_at` |
| **Security** | `password_hash` NVARCHAR(255); never SELECT in list APIs |
| **Queries** | Login by `email` |

---

### `refresh_tokens`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `user_id` → `users` ON DELETE **CASCADE** |
| **IX** | `(user_id)`; filtered `(expires_at) WHERE revoked_at IS NULL` for cleanup |
| **Audit** | `created_at` only |
| **Perf** | Purge job deletes expired rows weekly |

---

### `password_reset_tokens`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `user_id` → `users` ON DELETE **CASCADE** |
| **IX** | `(user_id)`; `(expires_at)` |
| **Audit** | `created_at`, `used_at` |
| **Perf** | Hard delete after use/expiry |

---

### `salon_financial_settings`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` → `salons` UNIQUE |
| **IX** | `UNIQUE (salon_id)` — one row per salon |
| **CC** | GST rate 0–100; positive loyalty rates |
| **Audit** | Full + **`rowversion`** |
| **Concurrency** | **Replace `next_receipt_sequence` with SEQUENCE object** |
| **Queries** | `WHERE salon_id = @id` |

---

### `salon_notification_settings`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` → `salons` UNIQUE |
| **IX** | `UNIQUE (salon_id)` |
| **Audit** | `created_at`, `updated_at` |
| **Queries** | Single row per salon |

---

### `customers`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` → `salons`; `current_tier_id` → `membership_tiers` SET NULL |
| **IX** | **Filtered** `UNIQUE (salon_id, phone_normalized) WHERE deleted_at IS NULL`; `(salon_id, status, last_visit_at DESC)` INCLUDE `(full_name, loyalty_points)`; `(salon_id, date_of_birth)` for campaigns |
| **CC** | Non-negative counters |
| **Audit** | Full + **`rowversion`** + `deleted_at`, `deleted_by` |
| **Computed** | `phone_normalized` = digits-only persisted |
| **Queries** | Phone lookup, name search, inactive filters |
| **Perf** | Hottest master table; keep row width lean |

---

### `customer_preferences`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `customer_id` → `customers` UNIQUE ON DELETE CASCADE; `favorite_service_id` → `services` SET NULL |
| **IX** | `UNIQUE (customer_id)` |
| **Audit** | `created_at`, `updated_at`, `updated_by` |

---

### `membership_tiers`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` → `salons` |
| **IX** | `UNIQUE (salon_id, slug)`; `(salon_id, rank)` |
| **CC** | `discount_percent` 0–100; `points_multiplier` &gt; 0 |
| **JSON** | `benefits` → `NVARCHAR(MAX)` + `ISJSON` or child table `tier_benefits` |
| **Audit** | Full audit |
| **Queries** | `WHERE salon_id AND is_active = 1 ORDER BY rank` |

---

### `customer_memberships`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered + `public_id UNIQUEIDENTIFIER` |
| **FK** | `customer_id`, `tier_id`, `salon_id` |
| **IX** | `(customer_id, status)`; `(salon_id, end_date)` filtered active |
| **CC** | `end_date >= start_date` when not null |
| **Audit** | `created_at`, `updated_at` |

---

### `loyalty_transactions`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `customer_id`, `salon_id`; `invoice_id` NULL |
| **IX** | `(customer_id, created_at DESC)` INCLUDE `(type, points, balance_after)`; `(salon_id, created_at)` for reports |
| **CC** | `points <> 0` |
| **Audit** | Append-only; **no updates/deletes** |
| **Perf** | High insert; archive after 2 years |

---

### `service_categories`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` → `salons` |
| **IX** | `UNIQUE (salon_id, name)`; `(salon_id, sort_order)` |
| **Audit** | Full |

---

### `services`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id`, `category_id` |
| **IX** | `(salon_id, category_id, is_active)` INCLUDE `(name, price, duration_minutes)`; filtered `WHERE deleted_at IS NULL` |
| **CC** | `price >= 0`, `duration_minutes > 0` |
| **Audit** | Soft delete + full audit |
| **Queries** | Service picker, billing catalog |

---

### `packages`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` → `salons` |
| **IX** | `(salon_id, is_active)` |
| **Audit** | Full |

---

### `package_services`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | **Clustered** `(package_id, service_id)` |
| **FK** | Both FKs ON DELETE CASCADE on package delete |
| **CC** | `quantity > 0` |
| **Perf** | Small junction; no surrogate needed |

---

### `products`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id`; `vendor_id` SET NULL |
| **IX** | Filtered `UNIQUE (salon_id, sku)`; `(salon_id, stock_qty, min_stock_qty)` filtered active for low-stock; `(salon_id, category)` |
| **CC** | Non-negative qty and prices |
| **Computed** | `stock_status` PERSISTED (ok/low/critical/out) — index optionally |
| **Audit** | Soft delete + **`rowversion`** |
| **Queries** | SKU scan, low stock, category filter |
| **Perf** | **Critical** — stock updates need `rowversion` |

---

### `stock_movements`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `product_id` → `products`; `salon_id`; typed FKs: `invoice_id`, `appointment_id`, `purchase_order_id` (replace polymorphic) |
| **IX** | `(product_id, created_at DESC)`; `(salon_id, movement_type, created_at)` |
| **CC** | One reference FK non-null per movement type (optional CHECK) |
| **Audit** | Append-only |
| **Perf** | Largest table long-term; partition/archive |

---

### `vendors`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` |
| **IX** | Filtered `UNIQUE (salon_id, name)` |
| **Audit** | Soft delete |

---

### `purchase_orders`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id`, `vendor_id` |
| **IX** | `UNIQUE (salon_id, po_number)`; `(salon_id, status, order_date DESC)` |
| **Audit** | Full + `rowversion` on status changes |

---

### `purchase_order_items`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `purchase_order_id` CASCADE; `product_id` |
| **IX** | `(purchase_order_id)` INCLUDE `(product_id, quantity_ordered)` |
| **CC** | Qty constraints |

---

### `appointments`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id`, `customer_id`; **remove** `invoice_id` FK (use reverse lookup) |
| **IX** | `(salon_id, scheduled_date, status)` INCLUDE `(scheduled_time, customer_id, staff_name)`; `(customer_id, scheduled_date DESC)`; optional filtered unique for slot conflict V2 |
| **CC** | `duration_minutes > 0` |
| **Audit** | Full + `rowversion` |
| **Queries** | Calendar, queue, customer history |
| **Perf** | Date-range queries dominate — cluster consideration: `(salon_id, scheduled_date, id)` |

---

### `appointment_services`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `appointment_id` CASCADE; `service_id`, `package_id` SET NULL |
| **IX** | `(appointment_id)` INCLUDE line columns |
| **CC** | Price/duration positive |
| **Audit** | Insert-only after confirmation (no updates) |

---

### `invoices`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered + `public_id UNIQUEIDENTIFIER` |
| **FK** | `salon_id`, `customer_id`, `appointment_id` NULL |
| **IX** | `UNIQUE (salon_id, receipt_number)`; `(salon_id, invoice_date DESC, id DESC)` INCLUDE `(total_amount, status, customer_id)`; `(customer_id, invoice_date DESC)` |
| **CC** | Amounts non-negative; status enum |
| **Audit** | `voided_at` instead of delete; **`rowversion`** |
| **Queries** | Daily revenue, customer bills, receipt lookup |
| **Perf** | Use SEQUENCE for receipt numbers; never delete |

---

### `invoice_line_items`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `invoice_id` ON DELETE NO ACTION |
| **IX** | `(invoice_id)` INCLUDE all display columns (covering) |
| **CC** | Line type vs FK consistency |
| **Audit** | Immutable after insert |

---

### `payments`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `invoice_id` |
| **IX** | `(invoice_id)`; `(paid_at)` for daily settlement |
| **CC** | `amount > 0` |
| **Audit** | Append-only |

---

### `coupons`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `UNIQUEIDENTIFIER` clustered |
| **FK** | `salon_id` |
| **IX** | Filtered `UNIQUE (salon_id, code_upper)`; `(salon_id, status, valid_till)` |
| **Computed** | `code_upper` = `UPPER(code)` persisted |
| **CC** | Date range; percentage cap |
| **Audit** | Soft delete |

---

### `coupon_redemptions`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `coupon_id`, `invoice_id`, `customer_id` |
| **IX** | `UNIQUE (invoice_id, coupon_id)`; `(coupon_id, redeemed_at)` |
| **Audit** | Append-only |

---

### `notifications`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `salon_id` |
| **IX** | Filtered `(salon_id, created_at DESC) WHERE is_read = 0`; `(salon_id, created_at DESC)` |
| **Audit** | `read_at` update only |
| **Perf** | Archive read notifications &gt; 90 days |

---

### `feedback`

| Aspect | Recommendation |
|--------|----------------|
| **PK** | `BIGINT IDENTITY` clustered |
| **FK** | `salon_id`, `customer_id`, `appointment_id` NULL |
| **IX** | `(salon_id, created_at DESC)`; `(customer_id)`; `(salon_id, rating)` |
| **CC** | Rating 1–5 |
| **Audit** | `updated_at` on reply only |

---

## 23. Prisma + SQL Server implementation notes (forward-looking)

| Topic | Guidance |
|-------|----------|
| Provider | `provider = "sqlserver"` in Prisma |
| GUID default | `@default(dbgenerated("NEWSEQUENTIALID()"))` |
| `rowversion` | `@updatedAt` does not replace; use `Unsupported("rowversion")` or raw query for concurrency |
| Filtered indexes | Not expressible in Prisma schema — add via raw migration SQL in dedicated step |
| Sequences | `CREATE SEQUENCE` via raw migration; Prisma `@@sequence` when supported |
| JSON column | `String @db.NVarChar(Max)` with app validation |
| Enum | Prisma `enum` maps to string or `TinyInt` + lookup |

---

## 24. Review checklist (sign-off)

- [ ] Hybrid PK strategy approved  
- [ ] Circular appointment/invoice FK resolved  
- [ ] Polymorphic stock movement references replaced  
- [ ] Filtered unique indexes for soft delete  
- [ ] `rowversion` on inventory and billing settings  
- [ ] Receipt SEQUENCE instead of app counter  
- [ ] Backup/recovery runbook documented  
- [ ] Archive jobs scheduled  
- [ ] Lookup tables for enums (reporting)  
- [ ] Security principals created (app vs migration)  

---

## 25. Next step

After sign-off on this review:

1. Update `DATABASE_DESIGN_V1.md` with SQL Server–specific decisions (PK strategy, FK cascade matrix).
2. Generate Prisma schema reflecting approved changes.
3. Create initial migration including lookup tables, sequences, and filtered indexes (raw SQL segments).
4. Seed V1 data and validate against frontend API contracts.

---

*This document is review-only. No Prisma models, SQL scripts, or migrations are included.*
