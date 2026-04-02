CREATE TABLE `workOrderFile` (
	`id` text PRIMARY KEY NOT NULL,
	`workOrderId` text NOT NULL,
	`customerId` text NOT NULL,
	`fileKey` text NOT NULL,
	`url` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`mimeType` text NOT NULL,
	`uploadedById` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`workOrderId`) REFERENCES `workOrder`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploadedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
