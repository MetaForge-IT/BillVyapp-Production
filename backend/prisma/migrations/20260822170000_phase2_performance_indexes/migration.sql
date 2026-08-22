-- Phase 2 performance indexes

CREATE INDEX `appointments_salon_id_updated_at_idx` ON `appointments`(`salon_id`, `updated_at` DESC);

CREATE INDEX `invoices_salon_id_status_balance_amount_idx` ON `invoices`(`salon_id`, `status`, `balance_amount`);

CREATE INDEX `customers_salon_id_joined_at_idx` ON `customers`(`salon_id`, `joined_at`);

CREATE INDEX `customers_salon_id_total_spend_idx` ON `customers`(`salon_id`, `total_spend` DESC);

CREATE INDEX `payments_paid_at_invoice_id_idx` ON `payments`(`paid_at`, `invoice_id`);
