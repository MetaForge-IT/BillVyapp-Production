-- Service catalog v2: normalized display/search fields + gender enum
-- Preserves existing service IDs, prices, and durations.

-- Categories: optional icon for UI
ALTER TABLE `service_categories`
  ADD COLUMN `icon` VARCHAR(100) NULL AFTER `description`;

-- Services: new catalog fields (nullable first for backfill)
ALTER TABLE `services`
  ADD COLUMN `service_code` VARCHAR(64) NULL AFTER `category_id`,
  ADD COLUMN `display_name` VARCHAR(200) NULL AFTER `name`,
  ADD COLUMN `service_group` VARCHAR(100) NULL AFTER `display_name`,
  ADD COLUMN `gender` ENUM('MALE', 'FEMALE', 'UNISEX') NOT NULL DEFAULT 'UNISEX' AFTER `duration_minutes`,
  ADD COLUMN `sort_order` SMALLINT NOT NULL DEFAULT 0 AFTER `popularity`;

-- Backfill display_name from legacy name
UPDATE `services`
SET `display_name` = `name`
WHERE `display_name` IS NULL;

-- Temporary unique service codes (data script may refine later)
UPDATE `services`
SET `service_code` = CONCAT('SVC-', REPLACE(LEFT(`id`, 13), '-', ''))
WHERE `service_code` IS NULL;

-- Map legacy gender_tag → gender enum
UPDATE `services`
SET `gender` = CASE
  WHEN LOWER(`gender_tag`) = 'male' THEN 'MALE'
  WHEN LOWER(`gender_tag`) = 'female' THEN 'FEMALE'
  ELSE 'UNISEX'
END;

-- Default service_group from category name (refined by follow-up data script)
UPDATE `services` s
INNER JOIN `service_categories` c ON c.`id` = s.`category_id`
SET s.`service_group` = c.`name`
WHERE s.`service_group` IS NULL;

-- Full searchable name: Category - Display (keep price/duration untouched)
UPDATE `services` s
INNER JOIN `service_categories` c ON c.`id` = s.`category_id`
SET s.`name` = CONCAT(c.`name`, ' - ', s.`display_name`)
WHERE s.`display_name` IS NOT NULL
  AND s.`name` NOT LIKE CONCAT(c.`name`, ' - %');

ALTER TABLE `services`
  MODIFY COLUMN `service_code` VARCHAR(64) NOT NULL,
  MODIFY COLUMN `display_name` VARCHAR(200) NOT NULL;

-- Drop legacy free-text gender tag
ALTER TABLE `services` DROP COLUMN `gender_tag`;

-- Indexes for large salon catalogs
CREATE UNIQUE INDEX `services_salon_id_service_code_key` ON `services` (`salon_id`, `service_code`);
CREATE INDEX `services_salon_id_category_id_gender_is_active_idx` ON `services` (`salon_id`, `category_id`, `gender`, `is_active`);
CREATE INDEX `services_salon_id_display_name_idx` ON `services` (`salon_id`, `display_name`);
CREATE INDEX `services_salon_id_service_group_idx` ON `services` (`salon_id`, `service_group`);
CREATE INDEX `services_salon_id_sort_order_idx` ON `services` (`salon_id`, `sort_order`);
