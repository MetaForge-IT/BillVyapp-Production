-- AlterTable
ALTER TABLE `feedback` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'new';

-- CreateIndex
CREATE INDEX `feedback_salon_id_status_idx` ON `feedback`(`salon_id`, `status`);

-- CreateIndex
CREATE UNIQUE INDEX `feedback_appointment_id_key` ON `feedback`(`appointment_id`);
