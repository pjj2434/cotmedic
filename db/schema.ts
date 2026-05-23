import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

// Better Auth core + admin plugin schema
// Uses camelCase to match better-auth field names
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  displayUsername: text("displayUsername"),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
  // Admin plugin: owner | technician | client | employee | administrator
  role: text("role"),
  resetPassword: integer("resetPassword", { mode: "boolean" }),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("banReason"),
  banExpires: text("banExpires"),
  // Customer type for role=client (location): "cot" | "lift" | "both"
  customerType: text("customerType"),
  /** role=client: location street/mailing address */
  address: text("address"),
  /** role=employee: user id of the location (client) this login belongs to */
  locationId: text("locationId"),
  /** role=administrator: JSON string array of location (client) user ids */
  managedLocationIds: text("managedLocationIds"),
});

// Client files (PDF, images) – stored in UploadThing, metadata in DB
export const clientFile = sqliteTable("clientFile", {
  id: text("id").primaryKey(),
  clientId: text("clientId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fileKey: text("fileKey").notNull(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mimeType").notNull(),
  uploadedById: text("uploadedById")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: text("createdAt").notNull(),
});

// Work order files (PDF, images) – attached directly to a work order
export const workOrderFile = sqliteTable("workOrderFile", {
  id: text("id").primaryKey(),
  workOrderId: text("workOrderId")
    .notNull()
    .references(() => workOrder.id, { onDelete: "cascade" }),
  customerId: text("customerId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fileKey: text("fileKey").notNull(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mimeType").notNull(),
  uploadedById: text("uploadedById")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: text("createdAt").notNull(),
});

// Work order / repair report
export const workOrder = sqliteTable("workOrder", {
  id: text("id").primaryKey(),
  technicianId: text("technicianId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  customerId: text("customerId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "cot" | "lift"
  formData: text("formData").notNull(), // JSON
  /** User who submitted the report (owner vs technician). Null on legacy rows (excluded from tech analytics). */
  submittedById: text("submittedById").references(() => user.id, { onDelete: "set null" }),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
  // Admin plugin: impersonation
  impersonatedBy: text("impersonatedBy"),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: text("accessTokenExpiresAt"),
  refreshTokenExpiresAt: text("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

/** Better Auth magic-link / verification tokens — matches existing `verification` table (0000 migration). */
export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt"),
  updatedAt: text("updatedAt"),
});

/** CRM client record (QuickBooks-synced); separate from portal location logins. */
export const clientRecord = sqliteTable("clientRecord", {
  id: text("id").primaryKey(),
  /** QuickBooks DisplayName (must be unique in QB). */
  name: text("name").notNull(),
  quickbooksCustomerId: text("quickbooksCustomerId").unique(),
  companyName: text("companyName"),
  email: text("email"),
  phone: text("phone"),
  billStreet: text("billStreet"),
  billCity: text("billCity"),
  billState: text("billState"),
  billZip: text("billZip"),
  billCountry: text("billCountry"),
  /** Optional link to portal location user (role=client). */
  portalUserId: text("portalUserId").references(() => user.id, { onDelete: "set null" }),
  /** Balance in cents from QuickBooks Customer.Balance. */
  balanceCents: integer("balanceCents").notNull().default(0),
  /** current | open | overdue | unknown */
  paymentStatus: text("paymentStatus").notNull().default("unknown"),
  /** JSON array of manual tag ids (e.g. vip). Overdue/inactive are derived at read time. */
  tags: text("tags").notNull().default("[]"),
  /** CRM active flag (separate from QuickBooks Customer.Active). */
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  lastQuickbooksSyncAt: text("lastQuickbooksSyncAt"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

/** Service agreement files for CRM client records (private UploadThing storage). */
export const clientRecordFile = sqliteTable("clientRecordFile", {
  id: text("id").primaryKey(),
  clientRecordId: text("clientRecordId")
    .notNull()
    .references(() => clientRecord.id, { onDelete: "cascade" }),
  fileKey: text("fileKey").notNull(),
  /** Original UploadThing URL; use signed URLs for private access. */
  url: text("url").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mimeType").notNull(),
  uploadedById: text("uploadedById").references(() => user.id, { onDelete: "set null" }),
  createdAt: text("createdAt").notNull(),
});

/** Singleton QuickBooks OAuth connection (id always "default"). */
export const quickbooksConnection = sqliteTable("quickbooksConnection", {
  id: text("id").primaryKey(),
  realmId: text("realmId").notNull(),
  refreshToken: text("refreshToken").notNull(),
  accessToken: text("accessToken"),
  accessTokenExpiresAt: text("accessTokenExpiresAt"),
  environment: text("environment").notNull(),
  connectedAt: text("connectedAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export const clientContact = sqliteTable("clientContact", {
  id: text("id").primaryKey(),
  clientRecordId: text("clientRecordId")
    .notNull()
    .references(() => clientRecord.id, { onDelete: "cascade" }),
  /** QuickBooks sub-customer / job id when synced from QBO. */
  quickbooksCustomerId: text("quickbooksCustomerId").unique(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  /** Site or branch label (e.g. sub-customer name in QuickBooks). */
  location: text("location"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country"),
  /** Notes from QuickBooks sub-customer or entered manually. */
  notes: text("notes"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

/** Latest known delivery state per sign-in email for magic-link sends. */
export const magicLinkDelivery = sqliteTable("magicLinkDelivery", {
  email: text("email").primaryKey(),
  userId: text("userId").references(() => user.id, { onDelete: "set null" }),
  messageId: text("messageId"),
  status: text("status").notNull().default("pending"),
  rawEvent: text("rawEvent"),
  lastSentAt: text("lastSentAt").notNull(),
  lastCheckedAt: text("lastCheckedAt"),
  updatedAt: text("updatedAt").notNull(),
});
