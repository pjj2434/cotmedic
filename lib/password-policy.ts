/** Shared rules for portal password changes (client + server). */
export function validateNewPassword(pwd: string): string | null {
  if (pwd.length < 8) return "At least 8 characters";
  if (!/[A-Z]/.test(pwd)) return "At least one capital letter";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd))
    return "At least one special character (!@#$%^&*...)";
  return null;
}
