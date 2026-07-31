-- Franchise + multi-shop support; nullable salon_id for platform super_admin.

CREATE TABLE `franchises` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `logo_url` VARCHAR(500) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `franchises_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `salons`
  ADD COLUMN `franchise_id` CHAR(36) NULL,
  ADD COLUMN `display_name` VARCHAR(100) NULL,
  ADD COLUMN `code` VARCHAR(40) NULL;

CREATE INDEX `salons_franchise_id_idx` ON `salons`(`franchise_id`);

-- Drop NOT NULL on users.salon_id (super_admin has no shop).
ALTER TABLE `users`
  MODIFY COLUMN `salon_id` CHAR(36) NULL,
  ADD COLUMN `franchise_id` CHAR(36) NULL;

CREATE INDEX `users_franchise_id_idx` ON `users`(`franchise_id`);
CREATE INDEX `users_email_idx` ON `users`(`email`);
