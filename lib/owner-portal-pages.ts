/** Owner portal destinations for global search (pages + keywords). */
export const OWNER_PORTAL_PAGES = [
  { href: "/portal", label: "Dashboard", keywords: "home overview" },
  { href: "/portal/employees", label: "Employees", keywords: "staff technicians team" },
  { href: "/portal/customers", label: "Locations & logins", keywords: "customers locations portal logins clients" },
  { href: "/portal/client-database", label: "Client database", keywords: "crm quickbooks clients billing" },
  { href: "/portal/work-orders", label: "Work orders", keywords: "repairs reports cot lift" },
  { href: "/portal/analytics", label: "Analytics", keywords: "metrics charts stats" },
  { href: "/portal/settings/password", label: "Settings", keywords: "password account security" },
] as const;

export function searchOwnerPortalPages(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [...OWNER_PORTAL_PAGES];
  return OWNER_PORTAL_PAGES.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.href.toLowerCase().includes(q) ||
      p.keywords.toLowerCase().includes(q)
  );
}
