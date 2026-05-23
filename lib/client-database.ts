import type { PaymentStatus } from "@/lib/quickbooks";

export function formatBalanceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function paymentStatusLabel(status: string): string {
  switch (status as PaymentStatus) {
    case "overdue":
      return "Overdue";
    case "open":
      return "Open balance";
    case "current":
      return "Current";
    default:
      return "Not synced";
  }
}

export function formatClientBillingAddress(client: {
  billStreet?: string | null;
  billCity?: string | null;
  billState?: string | null;
  billZip?: string | null;
  billCountry?: string | null;
}): string | null {
  const parts = [
    client.billStreet?.trim(),
    [client.billCity?.trim(), client.billState?.trim()].filter(Boolean).join(", "),
    client.billZip?.trim(),
    client.billCountry?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : null;
}

/** Single-line billing address for tables. */
export function formatContactAddress(contact: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}): string | null {
  const parts = [
    contact.street?.trim(),
    [contact.city?.trim(), contact.state?.trim()].filter(Boolean).join(", "),
    contact.zip?.trim(),
    contact.country?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : null;
}

export function formatContactAddressInline(contact: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}): string | null {
  const multiline = formatContactAddress(contact);
  return multiline ? multiline.replace(/\n/g, ", ") : null;
}

export function formatClientBillingAddressInline(client: {
  billStreet?: string | null;
  billCity?: string | null;
  billState?: string | null;
  billZip?: string | null;
  billCountry?: string | null;
}): string | null {
  const multiline = formatClientBillingAddress(client);
  return multiline ? multiline.replace(/\n/g, ", ") : null;
}

export function paymentStatusClass(status: string): string {
  switch (status) {
    case "overdue":
      return "bg-red-100 text-red-800 ring-red-200/80";
    case "open":
      return "bg-amber-100 text-amber-900 ring-amber-200/80";
    case "current":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200/80";
    default:
      return "bg-zinc-100 text-zinc-600 ring-zinc-200/80";
  }
}
