-- Add customers.source to differentiate walk-in vs online appointment origin.
ALTER TABLE `customers`
  ADD COLUMN `source` VARCHAR(20) NOT NULL DEFAULT 'unknown';

CREATE INDEX `customers_salon_id_source_idx` ON `customers`(`salon_id`, `source`);

-- Backfill from the customer's earliest appointment type (walk_in → walk-in, else online).
UPDATE `customers` AS c
INNER JOIN (
  SELECT `customer_id`,
         MIN(CASE WHEN `appointment_type` = 'walk_in' THEN 0 ELSE 1 END) AS first_type
  FROM `appointments`
  GROUP BY `customer_id`
) AS a ON a.customer_id = c.id
SET c.`source` = CASE WHEN a.first_type = 0 THEN 'walk-in' ELSE 'online' END
WHERE c.`source` = 'unknown';
