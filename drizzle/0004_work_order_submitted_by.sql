ALTER TABLE `workOrder` ADD COLUMN `submittedById` text REFERENCES `user`(`id`) ON DELETE SET NULL;
