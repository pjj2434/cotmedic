CREATE TABLE `quickbooksConnection` (
	`id` text PRIMARY KEY NOT NULL,
	`realmId` text NOT NULL,
	`refreshToken` text NOT NULL,
	`accessToken` text,
	`accessTokenExpiresAt` text,
	`environment` text NOT NULL,
	`connectedAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
