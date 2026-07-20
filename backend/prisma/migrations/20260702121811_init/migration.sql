-- CreateTable
CREATE TABLE `salons` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `tagline` VARCHAR(500) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `pincode` VARCHAR(20) NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `website` VARCHAR(255) NULL,
    `gstin` VARCHAR(15) NULL,
    `logo_url` VARCHAR(500) NULL,
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `salons_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_hours` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `day_of_week` SMALLINT NOT NULL,
    `open_time` TIME(0) NULL,
    `close_time` TIME(0) NULL,
    `is_closed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `business_hours_salon_id_day_of_week_key`(`salon_id`, `day_of_week`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(200) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'manager',
    `phone` VARCHAR(20) NULL,
    `avatar_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `email_verified_at` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_salon_id_email_key`(`salon_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_agent` VARCHAR(500) NULL,
    `ip_address` VARCHAR(45) NULL,

    UNIQUE INDEX `refresh_tokens_public_id_key`(`public_id`),
    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    INDEX `refresh_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_public_id_key`(`public_id`),
    INDEX `password_reset_tokens_user_id_idx`(`user_id`),
    INDEX `password_reset_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salon_financial_settings` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `gst_enabled` BOOLEAN NOT NULL DEFAULT true,
    `default_gst_rate` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    `loyalty_points_per_rupee` DECIMAL(10, 4) NOT NULL DEFAULT 0.10,
    `loyalty_rupee_per_point` DECIMAL(10, 2) NOT NULL DEFAULT 0.50,
    `max_discount_percent` DECIMAL(5, 2) NOT NULL DEFAULT 50.00,
    `round_off_mode` VARCHAR(10) NOT NULL DEFAULT 'none',
    `receipt_prefix` VARCHAR(10) NOT NULL DEFAULT 'RCP',
    `next_receipt_sequence` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `salon_financial_settings_salon_id_key`(`salon_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salon_notification_settings` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `low_stock_alerts` BOOLEAN NOT NULL DEFAULT true,
    `low_stock_threshold_qty` INTEGER NOT NULL DEFAULT 10,
    `appointment_reminder_enabled` BOOLEAN NOT NULL DEFAULT true,
    `reminder_minutes_before` INTEGER NOT NULL DEFAULT 60,
    `daily_summary_enabled` BOOLEAN NOT NULL DEFAULT false,
    `daily_summary_time` TIME(0) NOT NULL DEFAULT '20:00:00',
    `payment_alerts` BOOLEAN NOT NULL DEFAULT true,
    `sms_enabled` BOOLEAN NOT NULL DEFAULT false,
    `whatsapp_enabled` BOOLEAN NOT NULL DEFAULT false,
    `email_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `salon_notification_settings_salon_id_key`(`salon_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NULL,
    `full_name` VARCHAR(200) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `phone_normalized` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NULL,
    `gender` VARCHAR(10) NULL,
    `date_of_birth` DATE NULL,
    `address` TEXT NULL,
    `gstin` VARCHAR(15) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `loyalty_points` INTEGER NOT NULL DEFAULT 0,
    `total_visits` INTEGER NOT NULL DEFAULT 0,
    `total_spend` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `avg_satisfaction` DECIMAL(3, 2) NULL,
    `last_visit_at` DATETIME(3) NULL,
    `joined_at` DATE NOT NULL,
    `current_tier_id` CHAR(36) NULL,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customers_salon_id_status_idx`(`salon_id`, `status`),
    INDEX `customers_salon_id_last_visit_at_idx`(`salon_id`, `last_visit_at`),
    INDEX `customers_salon_id_date_of_birth_idx`(`salon_id`, `date_of_birth`),
    UNIQUE INDEX `customers_salon_id_phone_normalized_key`(`salon_id`, `phone_normalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_preferences` (
    `id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `favorite_service_id` CHAR(36) NULL,
    `preferred_staff_name` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_preferences_customer_id_key`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership_tiers` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `rank` SMALLINT NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `duration_months` SMALLINT NOT NULL DEFAULT 12,
    `discount_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `points_multiplier` DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
    `benefits` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `membership_tiers_salon_id_rank_idx`(`salon_id`, `rank`),
    UNIQUE INDEX `membership_tiers_salon_id_slug_key`(`salon_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_memberships` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `tier_id` CHAR(36) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `amount_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_memberships_public_id_key`(`public_id`),
    INDEX `customer_memberships_customer_id_status_idx`(`customer_id`, `status`),
    INDEX `customer_memberships_salon_id_end_date_idx`(`salon_id`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `invoice_id` BIGINT NULL,
    `type` VARCHAR(20) NOT NULL,
    `points` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `loyalty_transactions_public_id_key`(`public_id`),
    INDEX `loyalty_transactions_customer_id_created_at_idx`(`customer_id`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_categories` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_categories_salon_id_name_key`(`salon_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `member_price` DECIMAL(10, 2) NULL,
    `duration_minutes` SMALLINT NOT NULL DEFAULT 30,
    `gender_tag` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` CHAR(36) NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `services_salon_id_category_id_is_active_idx`(`salon_id`, `category_id`, `is_active`),
    INDEX `services_salon_id_name_idx`(`salon_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `member_price` DECIMAL(10, 2) NULL,
    `duration_minutes` SMALLINT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `packages_salon_id_is_active_idx`(`salon_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_services` (
    `package_id` CHAR(36) NOT NULL,
    `service_id` CHAR(36) NOT NULL,
    `quantity` SMALLINT NOT NULL DEFAULT 1,

    PRIMARY KEY (`package_id`, `service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `contact_person` VARCHAR(200) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `gstin` VARCHAR(15) NULL,
    `payment_terms` VARCHAR(100) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `deleted_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendors_salon_id_name_key`(`salon_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `vendor_id` CHAR(36) NULL,
    `sku` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `brand` VARCHAR(100) NULL,
    `stock_qty` INTEGER NOT NULL DEFAULT 0,
    `min_stock_qty` INTEGER NOT NULL DEFAULT 0,
    `retail_price` DECIMAL(10, 2) NOT NULL,
    `cost_price` DECIMAL(10, 2) NOT NULL,
    `stock_status` VARCHAR(20) NOT NULL DEFAULT 'ok',
    `last_restocked_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `deleted_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_salon_id_category_idx`(`salon_id`, `category`),
    INDEX `products_salon_id_stock_qty_idx`(`salon_id`, `stock_qty`),
    UNIQUE INDEX `products_salon_id_sku_key`(`salon_id`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `movement_type` VARCHAR(30) NOT NULL,
    `qty_change` INTEGER NOT NULL,
    `stock_before` INTEGER NOT NULL,
    `stock_after` INTEGER NOT NULL,
    `invoice_id` BIGINT NULL,
    `appointment_id` CHAR(36) NULL,
    `purchase_order_id` CHAR(36) NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stock_movements_public_id_key`(`public_id`),
    INDEX `stock_movements_product_id_created_at_idx`(`product_id`, `created_at` DESC),
    INDEX `stock_movements_salon_id_movement_type_idx`(`salon_id`, `movement_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `vendor_id` CHAR(36) NOT NULL,
    `po_number` VARCHAR(30) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `order_date` DATE NOT NULL,
    `expected_date` DATE NULL,
    `delivered_date` DATE NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `purchase_orders_salon_id_status_idx`(`salon_id`, `status`),
    UNIQUE INDEX `purchase_orders_salon_id_po_number_key`(`salon_id`, `po_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `purchase_order_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `quantity_ordered` INTEGER NOT NULL,
    `quantity_received` INTEGER NOT NULL DEFAULT 0,
    `unit_cost` DECIMAL(10, 2) NOT NULL,
    `line_total` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `purchase_order_items_public_id_key`(`public_id`),
    INDEX `purchase_order_items_purchase_order_id_idx`(`purchase_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NULL,
    `customer_id` CHAR(36) NOT NULL,
    `appointment_type` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `scheduled_date` DATE NOT NULL,
    `scheduled_time` TIME(0) NOT NULL,
    `duration_minutes` SMALLINT NOT NULL,
    `staff_name` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `cancelled_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `appointments_salon_id_scheduled_date_status_idx`(`salon_id`, `scheduled_date`, `status`),
    INDEX `appointments_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_services` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `appointment_id` CHAR(36) NOT NULL,
    `service_id` CHAR(36) NULL,
    `package_id` CHAR(36) NULL,
    `item_name` VARCHAR(200) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `duration_minutes` SMALLINT NOT NULL,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `appointment_services_public_id_key`(`public_id`),
    INDEX `appointment_services_appointment_id_idx`(`appointment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `appointment_id` CHAR(36) NULL,
    `receipt_number` VARCHAR(30) NOT NULL,
    `invoice_date` DATE NOT NULL,
    `invoice_time` TIME(0) NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'paid',
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `membership_discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `coupon_discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gst_rate` DECIMAL(5, 2) NOT NULL,
    `gst_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `loyalty_points_earned` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `voided_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_public_id_key`(`public_id`),
    INDEX `invoices_salon_id_invoice_date_idx`(`salon_id`, `invoice_date` DESC),
    INDEX `invoices_customer_id_idx`(`customer_id`),
    UNIQUE INDEX `invoices_salon_id_receipt_number_key`(`salon_id`, `receipt_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_line_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `invoice_id` BIGINT NOT NULL,
    `line_type` VARCHAR(20) NOT NULL,
    `service_id` CHAR(36) NULL,
    `product_id` CHAR(36) NULL,
    `package_id` CHAR(36) NULL,
    `item_name` VARCHAR(200) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `line_discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoice_line_items_public_id_key`(`public_id`),
    INDEX `invoice_line_items_invoice_id_idx`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `invoice_id` BIGINT NOT NULL,
    `payment_method` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `reference` VARCHAR(100) NULL,
    `paid_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payments_public_id_key`(`public_id`),
    INDEX `payments_invoice_id_idx`(`invoice_id`),
    INDEX `payments_paid_at_idx`(`paid_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `code_upper` VARCHAR(30) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `coupon_type` VARCHAR(20) NOT NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `min_spend` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `max_discount` DECIMAL(10, 2) NULL,
    `valid_from` DATE NOT NULL,
    `valid_till` DATE NOT NULL,
    `usage_limit` INTEGER NOT NULL DEFAULT 0,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `applicable_to` VARCHAR(100) NOT NULL DEFAULT 'all',
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `deleted_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,
    `deleted_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `coupons_salon_id_status_idx`(`salon_id`, `status`),
    UNIQUE INDEX `coupons_salon_id_code_upper_key`(`salon_id`, `code_upper`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon_redemptions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `coupon_id` CHAR(36) NOT NULL,
    `invoice_id` BIGINT NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `discount_applied` DECIMAL(10, 2) NOT NULL,
    `redeemed_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupon_redemptions_public_id_key`(`public_id`),
    INDEX `coupon_redemptions_coupon_id_idx`(`coupon_id`),
    UNIQUE INDEX `coupon_redemptions_invoice_id_coupon_id_key`(`invoice_id`, `coupon_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `category` VARCHAR(30) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `action_href` VARCHAR(255) NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `read_at` DATETIME(3) NULL,

    UNIQUE INDEX `notifications_public_id_key`(`public_id`),
    INDEX `notifications_salon_id_is_read_created_at_idx`(`salon_id`, `is_read`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `appointment_id` CHAR(36) NULL,
    `service_name` VARCHAR(200) NULL,
    `staff_name` VARCHAR(200) NULL,
    `rating` SMALLINT NOT NULL,
    `comment` TEXT NULL,
    `sentiment` VARCHAR(20) NULL,
    `source` VARCHAR(20) NOT NULL DEFAULT 'app',
    `is_replied` BOOLEAN NOT NULL DEFAULT false,
    `reply_text` TEXT NULL,
    `replied_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feedback_public_id_key`(`public_id`),
    INDEX `feedback_salon_id_created_at_idx`(`salon_id`, `created_at` DESC),
    INDEX `feedback_customer_id_idx`(`customer_id`),
    INDEX `feedback_salon_id_rating_idx`(`salon_id`, `rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `business_hours` ADD CONSTRAINT `business_hours_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `salon_financial_settings` ADD CONSTRAINT `salon_financial_settings_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `salon_notification_settings` ADD CONSTRAINT `salon_notification_settings_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_current_tier_id_fkey` FOREIGN KEY (`current_tier_id`) REFERENCES `membership_tiers`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_deleted_by_fkey` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer_preferences` ADD CONSTRAINT `customer_preferences_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer_preferences` ADD CONSTRAINT `customer_preferences_favorite_service_id_fkey` FOREIGN KEY (`favorite_service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `membership_tiers` ADD CONSTRAINT `membership_tiers_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer_memberships` ADD CONSTRAINT `customer_memberships_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer_memberships` ADD CONSTRAINT `customer_memberships_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer_memberships` ADD CONSTRAINT `customer_memberships_tier_id_fkey` FOREIGN KEY (`tier_id`) REFERENCES `membership_tiers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_deleted_by_fkey` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `package_services` ADD CONSTRAINT `package_services_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `package_services` ADD CONSTRAINT `package_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_deleted_by_fkey` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_deleted_by_fkey` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appointment_services` ADD CONSTRAINT `appointment_services_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appointment_services` ADD CONSTRAINT `appointment_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appointment_services` ADD CONSTRAINT `appointment_services_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_deleted_by_fkey` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

