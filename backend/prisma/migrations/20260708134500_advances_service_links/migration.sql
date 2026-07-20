-- Customer advances
CREATE TABLE `customer_advances` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NULL,
    `customer_name` VARCHAR(200) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `service` VARCHAR(200) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `used` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `booked_for` DATE NULL,
    `source` VARCHAR(50) NOT NULL DEFAULT 'manual',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_advances_salon_id_phone_idx`(`salon_id`, `phone`),
    INDEX `customer_advances_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Service product links
CREATE TABLE `service_product_links` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `service_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NULL,
    `sku` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `default_qty` INTEGER NOT NULL DEFAULT 1,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'piece',
    `waste_buffer` INTEGER NOT NULL DEFAULT 0,
    `min_qty` INTEGER NOT NULL DEFAULT 1,
    `max_qty` INTEGER NOT NULL DEFAULT 99,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_product_links_service_id_sku_key`(`service_id`, `sku`),
    INDEX `service_product_links_salon_id_service_id_idx`(`salon_id`, `service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `customer_advances` ADD CONSTRAINT `customer_advances_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `customer_advances` ADD CONSTRAINT `customer_advances_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `service_product_links` ADD CONSTRAINT `service_product_links_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `service_product_links` ADD CONSTRAINT `service_product_links_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `service_product_links` ADD CONSTRAINT `service_product_links_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
