CREATE TABLE `clientRecord` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`quickbooksCustomerId` text,
	`companyName` text,
	`email` text,
	`phone` text,
	`billStreet` text,
	`billCity` text,
	`billState` text,
	`billZip` text,
	`billCountry` text,
	`portalUserId` text,
	`balanceCents` integer DEFAULT 0 NOT NULL,
	`paymentStatus` text DEFAULT 'unknown' NOT NULL,
	`notes` text,
	`lastQuickbooksSyncAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`portalUserId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clientRecord_quickbooksCustomerId_unique` ON `clientRecord` (`quickbooksCustomerId`);
--> statement-breakpoint
CREATE TABLE `clientContact` (
	`id` text PRIMARY KEY NOT NULL,
	`clientRecordId` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`location` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`clientRecordId`) REFERENCES `clientRecord`(`id`) ON UPDATE no action ON DELETE cascade
);
