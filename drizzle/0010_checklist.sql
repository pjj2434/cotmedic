CREATE TABLE `checklist` (
	`id` text PRIMARY KEY NOT NULL,
	`technicianId` text NOT NULL,
	`customerId` text NOT NULL,
	`type` text NOT NULL,
	`formData` text NOT NULL,
	`submittedById` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`technicianId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submittedById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
