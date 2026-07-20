-- CreateTable
CREATE TABLE `expenses` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `sub_category` VARCHAR(200) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `remarks` VARCHAR(500) NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `expenses_salon_id_date_idx`(`salon_id`, `date`),
    INDEX `expenses_salon_id_category_idx`(`salon_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_periods` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` SMALLINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `budget_periods_salon_id_year_month_key`(`salon_id`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_lines` (
    `id` CHAR(36) NOT NULL,
    `budget_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `allocated` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budget_lines_budget_id_idx`(`budget_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `day_closes` (
    `id` CHAR(36) NOT NULL,
    `salon_id` CHAR(36) NOT NULL,
    `closing_date` DATE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'completed',
    `opening_cash` DECIMAL(12, 2) NOT NULL,
    `cash_sales` DECIMAL(12, 2) NOT NULL,
    `upi_sales` DECIMAL(12, 2) NOT NULL,
    `card_sales` DECIMAL(12, 2) NOT NULL,
    `total_expenses` DECIMAL(12, 2) NOT NULL,
    `cash_expenses` DECIMAL(12, 2) NOT NULL,
    `expected_cash` DECIMAL(12, 2) NOT NULL,
    `physical_cash` DECIMAL(12, 2) NOT NULL,
    `variance` DECIMAL(12, 2) NOT NULL,
    `variance_note` TEXT NULL,
    `upi_settled` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `card_settled` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `bank_drop` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `denom_counts` JSON NULL,
    `closed_by` CHAR(36) NULL,
    `closed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `day_closes_salon_id_closing_date_idx`(`salon_id`, `closing_date` DESC),
    UNIQUE INDEX `day_closes_salon_id_closing_date_key`(`salon_id`, `closing_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `budget_periods` ADD CONSTRAINT `budget_periods_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_budget_id_fkey` FOREIGN KEY (`budget_id`) REFERENCES `budget_periods`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `day_closes` ADD CONSTRAINT `day_closes_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `day_closes` ADD CONSTRAINT `day_closes_closed_by_fkey` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
