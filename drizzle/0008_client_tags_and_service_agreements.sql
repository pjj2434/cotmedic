ALTER TABLE `clientRecord` ADD COLUMN `tags` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `clientRecord` ADD COLUMN `isActive` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE TABLE `clientRecordFile` (
	`id` text PRIMARY KEY NOT NULL,
	`clientRecordId` text NOT NULL,
	`fileKey` text NOT NULL,
	`url` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`mimeType` text NOT NULL,
	`uploadedById` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`clientRecordId`) REFERENCES `clientRecord`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploadedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
