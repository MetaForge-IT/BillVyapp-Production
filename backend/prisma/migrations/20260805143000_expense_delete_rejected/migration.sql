-- AlterTable
ALTER TABLE `expenses` ADD COLUMN `delete_rejected_at` DATETIME(3) NULL,
    ADD COLUMN `delete_rejected_by` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_delete_rejected_by_fkey` FOREIGN KEY (`delete_rejected_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
