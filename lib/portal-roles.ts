export const LOCATION_PORTAL_ROLES = ["client", "employee", "administrator"] as const;
export type LocationPortalRole = (typeof LOCATION_PORTAL_ROLES)[number];

export function isLocationPortalRole(role: string): role is LocationPortalRole {
  return (LOCATION_PORTAL_ROLES as readonly string[]).includes(role);
}

/** Single-location portal experience (welcome hero, card list, “show more”). */
export function isClientLikePortalRole(role: string): boolean {
  return isLocationPortalRole(role);
}
