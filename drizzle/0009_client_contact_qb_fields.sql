ALTER TABLE `clientContact` ADD `quickbooksCustomerId` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `clientContact_quickbooksCustomerId_unique` ON `clientContact` (`quickbooksCustomerId`);
--> statement-breakpoint
ALTER TABLE `clientContact` ADD `street` text;
--> statement-breakpoint
ALTER TABLE `clientContact` ADD `city` text;
--> statement-breakpoint
ALTER TABLE `clientContact` ADD `state` text;
--> statement-breakpoint
ALTER TABLE `clientContact` ADD `zip` text;
--> statement-breakpoint
ALTER TABLE `clientContact` ADD `country` text;
--> statement-breakpoint
ALTER TABLE `clientContact` ADD `notes` text;
