-- CreateTable
CREATE TABLE `email_verification_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `link_token_hash` VARCHAR(255) NOT NULL,
    `otp_hash` VARCHAR(255) NOT NULL,
    `link_expires_at` DATETIME(3) NOT NULL,
    `otp_expires_at` DATETIME(3) NOT NULL,
    `otp_attempts` SMALLINT NOT NULL DEFAULT 0,
    `used_at` DATETIME(3) NULL,
    `invalidated_at` DATETIME(3) NULL,
    `last_sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_verification_tokens_public_id_key`(`public_id`),
    INDEX `email_verification_tokens_user_id_idx`(`user_id`),
    INDEX `email_verification_tokens_link_token_hash_idx`(`link_token_hash`),
    INDEX `email_verification_tokens_otp_expires_at_idx`(`otp_expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
