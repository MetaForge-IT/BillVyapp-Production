-- CreateTable
CREATE TABLE `product_categories` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_categories_salon_id_name_key`(`salon_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add new product columns
ALTER TABLE `products` ADD COLUMN `category_id` CHAR(36) NULL;
ALTER TABLE `products` ADD COLUMN `barcode` VARCHAR(50) NULL;
ALTER TABLE `products` ADD COLUMN `gst_rate` DECIMAL(5, 2) NULL;
ALTER TABLE `products` ADD COLUMN `unit` VARCHAR(20) NOT NULL DEFAULT 'pcs';

-- Migrate legacy category strings into product_categories
INSERT INTO `product_categories` (`id`, `salon_id`, `name`, `sort_order`, `is_active`, `created_at`, `updated_at`)
SELECT UUID(), `salon_id`, `category`, 0, true, NOW(3), NOW(3)
FROM `products`
GROUP BY `salon_id`, `category`;

UPDATE `products` AS p
INNER JOIN `product_categories` AS pc
  ON p.`salon_id` = pc.`salon_id` AND p.`category` = pc.`name`
SET p.`category_id` = pc.`id`;

ALTER TABLE `products` DROP INDEX `products_salon_id_category_idx`;
ALTER TABLE `products` DROP COLUMN `category`;
ALTER TABLE `products` MODIFY `category_id` CHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX `products_salon_id_category_id_idx` ON `products`(`salon_id`, `category_id`);
CREATE UNIQUE INDEX `products_salon_id_name_key` ON `products`(`salon_id`, `name`);
CREATE UNIQUE INDEX `products_salon_id_barcode_key` ON `products`(`salon_id`, `barcode`);

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
