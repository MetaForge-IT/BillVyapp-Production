-- Membership wallet ledger (debits recorded at checkout when a customer redeems their
-- membership plan wallet balance). Mirrors the loyalty_transactions table's conventions.

CREATE TABLE `wallet_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `enrollment_id` CHAR(36) NOT NULL,
    `invoice_id` BIGINT NULL,
    `type` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `balance_after` DECIMAL(10, 2) NOT NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `wallet_transactions_public_id_key`(`public_id`),
    INDEX `wallet_transactions_customer_id_created_at_idx`(`customer_id`, `created_at` DESC),
    INDEX `wallet_transactions_enrollment_id_idx`(`enrollment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_enrollment_id_fkey` FOREIGN KEY (`enrollment_id`) REFERENCES `customer_plan_enrollments`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
