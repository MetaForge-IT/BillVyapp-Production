-- Manual discount audit: amount + reason stored per invoice (linked to customer_id)
ALTER TABLE `invoices`
  ADD COLUMN `manual_discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER `coupon_discount`,
  ADD COLUMN `manual_discount_reason` VARCHAR(500) NULL AFTER `manual_discount_amount`;
