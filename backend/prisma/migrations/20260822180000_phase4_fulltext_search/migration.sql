-- Phase 4: FULLTEXT indexes for global search

ALTER TABLE `customers`
  ADD FULLTEXT INDEX `customers_full_name_fulltext` (`full_name`);

ALTER TABLE `services`
  ADD FULLTEXT INDEX `services_name_display_fulltext` (`name`, `display_name`);
