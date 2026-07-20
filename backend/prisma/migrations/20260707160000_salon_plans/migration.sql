-- Dynamic membership & package plans

CREATE TABLE `salon_plans` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `name_preset` VARCHAR(30) NULL,
    `plan_type` VARCHAR(20) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `wallet_amount` DECIMAL(10, 2) NULL,
    `validity_days` SMALLINT NOT NULL,
    `service_limit` SMALLINT NULL,
    `discount_percent` DECIMAL(5, 2) NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `salon_plans_salon_id_is_active_idx`(`salon_id`, `is_active`),
    INDEX `salon_plans_salon_id_plan_type_idx`(`salon_id`, `plan_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `salon_plan_services` (
    `plan_id` CHAR(36) NOT NULL,
    `service_id` CHAR(36) NOT NULL,
    `quantity` SMALLINT NOT NULL DEFAULT 1,

    PRIMARY KEY (`plan_id`, `service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `customer_plan_enrollments` (
    `id` CHAR(36) NOT NULL,
    `public_id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `plan_id` CHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `wallet_total` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `wallet_used` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `services_total` SMALLINT NOT NULL DEFAULT 0,
    `services_used` SMALLINT NOT NULL DEFAULT 0,
    `start_date` DATE NOT NULL,
    `expiry_date` DATE NOT NULL,
    `amount_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_plan_enrollments_public_id_key`(`public_id`),
    INDEX `customer_plan_enrollments_salon_id_status_idx`(`salon_id`, `status`),
    INDEX `customer_plan_enrollments_customer_id_status_idx`(`customer_id`, `status`),
    INDEX `customer_plan_enrollments_salon_id_expiry_date_idx`(`salon_id`, `expiry_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `salon_plans` ADD CONSTRAINT `salon_plans_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `salon_plan_services` ADD CONSTRAINT `salon_plan_services_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `salon_plans`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `salon_plan_services` ADD CONSTRAINT `salon_plan_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `customer_plan_enrollments` ADD CONSTRAINT `customer_plan_enrollments_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `customer_plan_enrollments` ADD CONSTRAINT `customer_plan_enrollments_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `customer_plan_enrollments` ADD CONSTRAINT `customer_plan_enrollments_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `salon_plans`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
