/** True only in local/dev builds — never treat preview as dev for OAuth debug endpoints. */
export function isDevRuntime(): boolean {
  return process.env.NODE_ENV === "development";
}
