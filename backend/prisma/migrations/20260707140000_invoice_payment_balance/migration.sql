-- Add payment balance tracking for confirm-only checkout and pending payments
ALTER TABLE `invoices`
  ADD COLUMN `amount_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER `total_amount`,
  ADD COLUMN `balance_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER `amount_paid`,
  ADD COLUMN `due_date` DATE NULL AFTER `balance_amount`;

-- Backfill existing paid invoices
UPDATE `invoices`
SET
  `amount_paid` = `total_amount`,
  `balance_amount` = 0
WHERE `status` = 'paid';

UPDATE `invoices`
SET
  `amount_paid` = 0,
  `balance_amount` = `total_amount`
WHERE `status` IN ('pending', 'partially_paid');
