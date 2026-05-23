import {
  quickBooksApiBase,
  type QuickBooksConfig,
} from "@/lib/quickbooks-env";
import {
  getStoredQuickBooksAccessToken,
  resolveQuickBooksConfig,
  updateQuickBooksAccessToken,
  updateQuickBooksRefreshToken,
} from "@/lib/quickbooks-connection";
import {
  failQuickBooksRequest,
  parseQuickBooksFault,
} from "@/lib/quickbooks-error-log";

type QbAddress = {
  Line1?: string;
  Line2?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  Country?: string;
};

type QbCustomer = {
  Id: string;
  SyncToken?: string;
  DisplayName?: string;
  CompanyName?: string;
  FullyQualifiedName?: string;
  Balance?: number | string;
  Active?: boolean;
  Job?: boolean;
  ParentRef?: { value?: string };
  Notes?: string;
  BillAddr?: QbAddress;
  ShipAddr?: QbAddress;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  Mobile?: { FreeFormNumber?: string };
};

type QbInvoice = {
  CustomerRef?: { value?: string };
  Balance?: number | string;
  DueDate?: string;
};

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

/** QuickBooks customer IDs are numeric; validate before interpolating into query strings. */
function assertQuickBooksCustomerId(id: string): string {
  const trimmed = id.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Invalid QuickBooks customer id");
  }
  return trimmed;
}

export function clearQuickBooksAccessTokenCache() {
  cachedAccessToken = null;
}

async function refreshAccessToken(config: QuickBooksConfig): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const storedToken = await getStoredQuickBooksAccessToken();
  if (storedToken) {
    cachedAccessToken = { token: storedToken, expiresAtMs: Date.now() + 300_000 };
    return storedToken;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: config.refreshToken,
  });

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    failQuickBooksRequest({
      operation: "oauth:refresh_token",
      res,
      json: data,
      fallbackMessage: "Failed to refresh QuickBooks access token",
      oauthError: data.error,
      oauthErrorDescription: data.error_description,
    });
  }

  if (data.refresh_token) {
    await updateQuickBooksRefreshToken(data.refresh_token);
  }

  const expiresIn = Number(data.expires_in ?? 3600);
  cachedAccessToken = {
    token: data.access_token,
    expiresAtMs: Date.now() + expiresIn * 1000,
  };
  await updateQuickBooksAccessToken(data.access_token, expiresIn);
  return data.access_token;
}

async function qbQuery<T>(config: QuickBooksConfig, query: string): Promise<T[]> {
  const accessToken = await refreshAccessToken(config);
  const base = quickBooksApiBase(config.environment);
  const url = `${base}/v3/company/${config.realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const json = (await res.json().catch(() => ({}))) as {
    QueryResponse?: Record<string, unknown>;
    Fault?: { Error?: { Message?: string; Detail?: string }[] };
  };

  const fault = parseQuickBooksFault(json);
  if (!res.ok || fault) {
    failQuickBooksRequest({
      operation: "qb:query",
      res,
      json,
      realmId: config.realmId,
      fallbackMessage: "QuickBooks request failed",
    });
  }

  const response = json.QueryResponse ?? {};
  for (const key of Object.keys(response)) {
    if (key === "startPosition" || key === "maxResults" || key === "totalCount") continue;
    const rows = response[key];
    if (Array.isArray(rows)) return rows as T[];
    if (rows && typeof rows === "object") return [rows as T];
  }
  return [];
}

function parseMoneyToCents(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "0").replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function customerDisplayName(c: QbCustomer): string {
  return (c.DisplayName ?? c.CompanyName ?? "").trim() || `Customer ${c.Id}`;
}

export type QuickBooksCustomerBilling = {
  companyName: string | null;
  email: string | null;
  phone: string | null;
  billStreet: string | null;
  billCity: string | null;
  billState: string | null;
  billZip: string | null;
  billCountry: string | null;
};

function addressHasContent(addr?: QbAddress): boolean {
  if (!addr) return false;
  return !!(
    addr.Line1?.trim() ||
    addr.Line2?.trim() ||
    addr.City?.trim() ||
    addr.CountrySubDivisionCode?.trim() ||
    addr.PostalCode?.trim()
  );
}

/** Prefer BillAddr; many QBO customers only have ShipAddr filled in. */
function pickCustomerAddress(c: QbCustomer): QbAddress | undefined {
  if (addressHasContent(c.BillAddr)) return c.BillAddr;
  if (addressHasContent(c.ShipAddr)) return c.ShipAddr;
  return c.BillAddr ?? c.ShipAddr;
}

export function parseQuickBooksCustomerBilling(c: QbCustomer): QuickBooksCustomerBilling {
  const addr = pickCustomerAddress(c);
  const streetParts = [addr?.Line1?.trim(), addr?.Line2?.trim()].filter(Boolean);
  const phone =
    c.PrimaryPhone?.FreeFormNumber?.trim() || c.Mobile?.FreeFormNumber?.trim() || null;

  return {
    companyName: c.CompanyName?.trim() || null,
    email: c.PrimaryEmailAddr?.Address?.trim() || null,
    phone,
    billStreet: streetParts.length > 0 ? streetParts.join(", ") : null,
    billCity: addr?.City?.trim() || null,
    billState: addr?.CountrySubDivisionCode?.trim() || null,
    billZip: addr?.PostalCode?.trim() || null,
    billCountry: addr?.Country?.trim() || null,
  };
}

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type QuickBooksCustomerRow = {
  quickbooksCustomerId: string;
  name: string;
  balanceCents: number;
  active: boolean;
  notes: string | null;
} & QuickBooksCustomerBilling;

export type QuickBooksContactRow = {
  quickbooksCustomerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  notes: string | null;
};

export type QuickBooksSyncSnapshot = {
  customers: QuickBooksCustomerRow[];
  /** Sub-customers / jobs keyed by parent QuickBooks customer id. */
  contactsByParentQbId: Map<string, QuickBooksContactRow[]>;
  overdueCustomerIds: Set<string>;
};

function parseQuickBooksCustomerNotes(c: QbCustomer): string | null {
  return c.Notes?.trim() || null;
}

function subCustomerLocationLabel(c: QbCustomer): string | null {
  const fqn = c.FullyQualifiedName?.trim();
  if (fqn?.includes(":")) {
    const segment = fqn.split(":").pop()?.trim();
    if (segment) return segment;
  }
  const display = c.DisplayName?.trim();
  return display || null;
}

/** Map a QuickBooks sub-customer / job to a CRM contact row. */
export function parseQuickBooksContactFromSubCustomer(c: QbCustomer): QuickBooksContactRow {
  const billing = parseQuickBooksCustomerBilling(c);
  return {
    quickbooksCustomerId: String(c.Id),
    name: customerDisplayName(c),
    email: billing.email,
    phone: billing.phone,
    location: subCustomerLocationLabel(c),
    street: billing.billStreet,
    city: billing.billCity,
    state: billing.billState,
    zip: billing.billZip,
    country: billing.billCountry,
    notes: parseQuickBooksCustomerNotes(c),
  };
}

async function fetchAllQuickBooksCustomers(config: QuickBooksConfig): Promise<QbCustomer[]> {
  const all: QbCustomer[] = [];
  let startPosition = 1;
  const pageSize = 500;

  for (;;) {
    const batch = await qbQuery<QbCustomer>(
      config,
      `SELECT * FROM Customer STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`
    );
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
    startPosition += pageSize;
  }

  return all;
}

/** Sub-customers and jobs under a top-level QuickBooks customer (ParentRef not queryable). */
export async function fetchQuickBooksSubCustomersForParent(
  parentQuickbooksCustomerId: string
): Promise<QuickBooksContactRow[]> {
  const config = await resolveQuickBooksConfig();
  if (!config) {
    throw new Error(
      "QuickBooks is not connected. Connect QuickBooks from the client database page."
    );
  }

  const parentId = assertQuickBooksCustomerId(parentQuickbooksCustomerId);
  const all = await fetchAllQuickBooksCustomers(config);

  return all
    .filter((c) => c.Active !== false && String(c.ParentRef?.value ?? "") === parentId)
    .map(parseQuickBooksContactFromSubCustomer);
}

/** Fetch customers and which ones have past-due open invoices. */
export async function fetchQuickBooksClientSnapshot(): Promise<QuickBooksSyncSnapshot> {
  const config = await resolveQuickBooksConfig();
  if (!config) {
    throw new Error(
      "QuickBooks is not connected. Connect QuickBooks from the client database page."
    );
  }

  const all = await fetchAllQuickBooksCustomers(config);
  const customers: QuickBooksCustomerRow[] = [];
  const contactsByParentQbId = new Map<string, QuickBooksContactRow[]>();

  for (const c of all) {
    if (c.Active === false) continue;

    const parentId = c.ParentRef?.value ? String(c.ParentRef.value) : null;
    if (parentId) {
      const contact = parseQuickBooksContactFromSubCustomer(c);
      const list = contactsByParentQbId.get(parentId) ?? [];
      list.push(contact);
      contactsByParentQbId.set(parentId, list);
      continue;
    }

    customers.push({
      quickbooksCustomerId: String(c.Id),
      name: customerDisplayName(c),
      balanceCents: parseMoneyToCents(c.Balance),
      active: c.Active !== false,
      notes: parseQuickBooksCustomerNotes(c),
      ...parseQuickBooksCustomerBilling(c),
    });
  }

  const overdueCustomerIds = new Set<string>();
  const today = todayIsoDate();
  let startPosition = 1;
  const pageSize = 500;

  for (;;) {
    const invoices = await qbQuery<QbInvoice>(
      config,
      `SELECT CustomerRef, Balance, DueDate FROM Invoice WHERE Balance > '0' AND DueDate < '${today}' STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`
    );
    if (invoices.length === 0) break;
    for (const inv of invoices) {
      const customerId = inv.CustomerRef?.value;
      if (customerId) overdueCustomerIds.add(String(customerId));
    }
    if (invoices.length < pageSize) break;
    startPosition += pageSize;
  }

  return { customers, contactsByParentQbId, overdueCustomerIds };
}

export type PaymentStatus = "current" | "open" | "overdue" | "unknown";

export function derivePaymentStatus(
  balanceCents: number,
  quickbooksCustomerId: string | null,
  overdueCustomerIds: Set<string>
): PaymentStatus {
  if (!quickbooksCustomerId) return "unknown";
  if (overdueCustomerIds.has(quickbooksCustomerId)) return "overdue";
  if (balanceCents > 0) return "open";
  return "current";
}

export type QuickBooksCustomerUpdate = {
  name: string;
  balanceCents: number;
  paymentStatus: PaymentStatus;
  notes: string | null;
} & QuickBooksCustomerBilling;

/** Refresh one customer from QuickBooks (balance + overdue status). */
export async function fetchQuickBooksCustomerUpdate(
  quickbooksCustomerId: string
): Promise<QuickBooksCustomerUpdate> {
  const config = await resolveQuickBooksConfig();
  if (!config) {
    throw new Error(
      "QuickBooks is not connected. Connect QuickBooks from the client database page."
    );
  }

  const qbId = assertQuickBooksCustomerId(quickbooksCustomerId);
  const rows = await qbQuery<QbCustomer>(
    config,
    `SELECT * FROM Customer WHERE Id = '${qbId}'`
  );
  const c = rows[0];
  if (!c) throw new Error("Customer not found in QuickBooks");

  const balanceCents = parseMoneyToCents(c.Balance);
  const today = todayIsoDate();
  const overdueInvoices = await qbQuery<QbInvoice>(
    config,
    `SELECT Id FROM Invoice WHERE CustomerRef = '${qbId}' AND Balance > '0' AND DueDate < '${today}' MAXRESULTS 1`
  );
  const overdue = overdueInvoices.length > 0;
  const paymentStatus: PaymentStatus = overdue
    ? "overdue"
    : balanceCents > 0
      ? "open"
      : "current";

  return {
    name: customerDisplayName(c),
    balanceCents,
    paymentStatus,
    notes: parseQuickBooksCustomerNotes(c),
    ...parseQuickBooksCustomerBilling(c),
  };
}

export type QuickBooksCustomerWriteInput = {
  displayName?: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  billStreet?: string | null;
  billCity?: string | null;
  billState?: string | null;
  billZip?: string | null;
  billCountry?: string | null;
  notes?: string | null;
};

export type CreateQuickBooksCustomerInput = {
  displayName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  billStreet?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billCountry?: string;
};

type QbCustomerMutationResponse = {
  Customer?: QbCustomer;
  Fault?: { Error?: { Message?: string; Detail?: string }[] };
};

function buildQuickBooksBillAddr(input: {
  billStreet?: string | null;
  billCity?: string | null;
  billState?: string | null;
  billZip?: string | null;
  billCountry?: string | null;
}): Record<string, string> | null {
  const street = input.billStreet?.trim();
  const city = input.billCity?.trim();
  const state = input.billState?.trim();
  const zip = input.billZip?.trim();
  const country = (input.billCountry?.trim() || "USA").toUpperCase();
  if (!street && !city && !state && !zip) return null;
  return {
    ...(street ? { Line1: street } : {}),
    ...(city ? { City: city } : {}),
    ...(state ? { CountrySubDivisionCode: state } : {}),
    ...(zip ? { PostalCode: zip } : {}),
    Country: country === "US" ? "USA" : country,
  };
}

async function postQuickBooksCustomer(
  config: QuickBooksConfig,
  payload: Record<string, unknown>
): Promise<QbCustomer> {
  const accessToken = await refreshAccessToken(config);
  const base = quickBooksApiBase(config.environment);
  const url = `${base}/v3/company/${config.realmId}/customer?minorversion=65`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => ({}))) as QbCustomerMutationResponse;

  const fault = parseQuickBooksFault(json);
  if (!res.ok || fault || !json.Customer?.Id) {
    failQuickBooksRequest({
      operation: "qb:customer_mutation",
      res,
      json,
      realmId: config.realmId,
      fallbackMessage: "QuickBooks request failed",
    });
  }

  return json.Customer;
}

/** Create a customer in QuickBooks Online (DisplayName must be unique). */
export async function createQuickBooksCustomer(
  input: CreateQuickBooksCustomerInput
): Promise<{ quickbooksCustomerId: string; balanceCents: number }> {
  const config = await resolveQuickBooksConfig();
  if (!config) {
    throw new Error(
      "QuickBooks is not connected. Connect QuickBooks from the client database page."
    );
  }

  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("Client name is required");

  const payload: Record<string, unknown> = {
    DisplayName: displayName,
  };

  const companyName = input.companyName?.trim();
  if (companyName) payload.CompanyName = companyName;

  const email = input.email?.trim();
  if (email) payload.PrimaryEmailAddr = { Address: email };

  const phone = input.phone?.trim();
  if (phone) payload.PrimaryPhone = { FreeFormNumber: phone };

  const billAddr = buildQuickBooksBillAddr(input);
  if (billAddr) payload.BillAddr = billAddr;

  try {
    const customer = await postQuickBooksCustomer(config, payload);
    return {
      quickbooksCustomerId: String(customer.Id),
      balanceCents: parseMoneyToCents(customer.Balance),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "QuickBooks request failed";
    if (/duplicate|already exists/i.test(msg)) {
      throw new Error(
        `A QuickBooks customer named "${displayName}" already exists. Use a unique name or sync from QuickBooks.`
      );
    }
    throw e;
  }
}

/** Push customer field changes to QuickBooks Online (sparse update). */
export async function updateQuickBooksCustomer(
  quickbooksCustomerId: string,
  changes: QuickBooksCustomerWriteInput
): Promise<void> {
  const config = await resolveQuickBooksConfig();
  if (!config) {
    throw new Error(
      "QuickBooks is not connected. Connect QuickBooks from the client database page."
    );
  }

  const qbId = assertQuickBooksCustomerId(quickbooksCustomerId);
  const rows = await qbQuery<QbCustomer>(
    config,
    `SELECT * FROM Customer WHERE Id = '${qbId}'`
  );
  const current = rows[0];
  if (!current?.SyncToken) {
    throw new Error("Customer not found in QuickBooks");
  }

  const payload: Record<string, unknown> = {
    sparse: true,
    Id: qbId,
    SyncToken: current.SyncToken,
  };

  if (changes.displayName !== undefined) {
    const displayName = changes.displayName.trim();
    if (!displayName) throw new Error("Client name is required");
    payload.DisplayName = displayName;
  }

  if (changes.companyName !== undefined) {
    payload.CompanyName = changes.companyName?.trim() ?? "";
  }

  if (changes.email !== undefined) {
    payload.PrimaryEmailAddr = { Address: changes.email?.trim() ?? "" };
  }

  if (changes.phone !== undefined) {
    payload.PrimaryPhone = { FreeFormNumber: changes.phone?.trim() ?? "" };
  }

  if (changes.notes !== undefined) {
    payload.Notes = changes.notes?.trim() ?? "";
  }

  const billingTouched =
    changes.billStreet !== undefined ||
    changes.billCity !== undefined ||
    changes.billState !== undefined ||
    changes.billZip !== undefined ||
    changes.billCountry !== undefined;

  if (billingTouched) {
    const billAddr = buildQuickBooksBillAddr({
      billStreet: changes.billStreet,
      billCity: changes.billCity,
      billState: changes.billState,
      billZip: changes.billZip,
      billCountry: changes.billCountry,
    });
    if (billAddr) {
      payload.BillAddr = billAddr;
    } else {
      payload.BillAddr = {
        Line1: "",
        City: "",
        CountrySubDivisionCode: "",
        PostalCode: "",
        Country: "USA",
      };
    }
  }

  try {
    await postQuickBooksCustomer(config, payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "QuickBooks update failed";
    if (/duplicate|already exists/i.test(msg)) {
      throw new Error(
        "That display name is already used by another QuickBooks customer. Choose a different client name."
      );
    }
    throw e;
  }
}
