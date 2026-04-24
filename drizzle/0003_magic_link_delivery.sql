CREATE TABLE `magicLinkDelivery` (
	`email` text PRIMARY KEY NOT NULL,
	`userId` text,
	`messageId` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`rawEvent` text,
	`lastSentAt` text NOT NULL,
	`lastCheckedAt` text,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
