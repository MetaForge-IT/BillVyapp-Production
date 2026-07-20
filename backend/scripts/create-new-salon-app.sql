-- Run this in phpMyAdmin as an admin/root user (not salon_app).
-- Creates the new database and grants your app user access.

CREATE DATABASE IF NOT EXISTS `new_salon_app`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `new_salon_app`.* TO 'salon_app'@'%';
FLUSH PRIVILEGES;

-- Verify:
SHOW DATABASES LIKE 'new_salon_app';
SHOW GRANTS FOR 'salon_app'@'%';
