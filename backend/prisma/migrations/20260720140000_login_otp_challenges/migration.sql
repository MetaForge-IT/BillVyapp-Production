-- CreateTable
CREATE TABLE `login_otp_challenges` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `otp_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `attempts` SMALLINT NOT NULL DEFAULT 0,
    `consumed_at` DATETIME(3) NULL,
    `remember_me` BOOLEAN NOT NULL DEFAULT false,
    `last_sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_otp_challenges_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `login_otp_challenges_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `login_otp_challenges` ADD CONSTRAINT `login_otp_challenges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
