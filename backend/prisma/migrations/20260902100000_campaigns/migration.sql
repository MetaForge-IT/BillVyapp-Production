-- CreateTable
CREATE TABLE `campaigns` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `offer_type` VARCHAR(20) NOT NULL,
    `offer_value` DECIMAL(10, 2) NOT NULL,
    `applicable_scope` VARCHAR(30) NOT NULL DEFAULT 'all_services',
    `valid_from` DATE NOT NULL,
    `valid_till` DATE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `coupon_id` CHAR(36) NULL,
    `generate_coupon` BOOLEAN NOT NULL DEFAULT true,
    `sent_count` INTEGER NOT NULL DEFAULT 0,
    `failed_count` INTEGER NOT NULL DEFAULT 0,
    `sent_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `campaigns_salon_id_status_idx`(`salon_id`, `status`),
    INDEX `campaigns_salon_id_created_at_idx`(`salon_id`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_services` (
    `campaign_id` CHAR(36) NOT NULL,
    `service_id` CHAR(36) NOT NULL,

    PRIMARY KEY (`campaign_id`, `service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_sends` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `campaign_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'queued',
    `whatsapp_message_id` VARCHAR(120) NULL,
    `error_message` VARCHAR(500) NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `campaign_sends_campaign_id_status_idx`(`campaign_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `campaign_services` ADD CONSTRAINT `campaign_services_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `campaign_services` ADD CONSTRAINT `campaign_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `campaign_sends` ADD CONSTRAINT `campaign_sends_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `campaign_sends` ADD CONSTRAINT `campaign_sends_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
