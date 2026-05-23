const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /(refresh_token|access_token|client_secret|password|api_key)\s*[=:]\s*["']?[^\s"'&]+/gi,
  /"refresh_token"\s*:\s*"[^"]+"/gi,
  /"access_token"\s*:\s*"[^"]+"/gi,
  /"client_secret"\s*:\s*"[^"]+"/gi,
];

/** Strip tokens and secrets before writing server logs. */
export function redactSecretsForLog(value: string | undefined): string | undefined {
  if (!value) return value;
  let out = value;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

/** Intuit transaction id from API response headers (for Intuit support troubleshooting). */
export function getIntuitTidFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get("intuit_tid")?.trim() ||
    headers.get("Intuit-Tid")?.trim() ||
    headers.get("intuit-tid")?.trim() ||
    undefined
  );
}

export type QuickBooksFaultInfo = {
  code?: string;
  message?: string;
  detail?: string;
};

export function parseQuickBooksFault(json: unknown): QuickBooksFaultInfo | null {
  const err = (json as { Fault?: { Error?: { Message?: string; Detail?: string; code?: string }[] } })
    ?.Fault?.Error?.[0];
  if (!err) return null;
  return {
    code: err.code,
    message: err.Message,
    detail: err.Detail,
  };
}

export type QuickBooksErrorLogEntry = {
  at: string;
  operation: string;
  httpStatus: number;
  intuitTid?: string;
  realmId?: string;
  faultCode?: string;
  message: string;
  detail?: string;
  oauthError?: string;
};

/** Structured server log for Intuit / operator troubleshooting (Vercel log drain, etc.). */
export function logQuickBooksError(
  entry: Omit<QuickBooksErrorLogEntry, "at">
): QuickBooksErrorLogEntry {
  const payload: QuickBooksErrorLogEntry = {
    at: new Date().toISOString(),
    operation: entry.operation,
    httpStatus: entry.httpStatus,
    intuitTid: entry.intuitTid,
    realmId: entry.realmId,
    faultCode: entry.faultCode,
    message: redactSecretsForLog(entry.message) ?? entry.message,
    detail: redactSecretsForLog(entry.detail),
    oauthError: redactSecretsForLog(entry.oauthError),
  };
  console.error("[quickbooks-error]", JSON.stringify(payload));
  return payload;
}

export class QuickBooksApiError extends Error {
  readonly intuitTid?: string;
  readonly operation: string;
  readonly httpStatus: number;
  readonly logEntry: QuickBooksErrorLogEntry;

  constructor(input: {
    operation: string;
    httpStatus: number;
    message: string;
    intuitTid?: string;
    logEntry: QuickBooksErrorLogEntry;
  }) {
    super(input.message);
    this.name = "QuickBooksApiError";
    this.operation = input.operation;
    this.httpStatus = input.httpStatus;
    this.intuitTid = input.intuitTid;
    this.logEntry = input.logEntry;
  }
}

export function failQuickBooksRequest(input: {
  operation: string;
  res: Response;
  json: unknown;
  realmId?: string;
  fallbackMessage: string;
  oauthError?: string;
  oauthErrorDescription?: string;
}): never {
  const intuitTid = getIntuitTidFromHeaders(input.res.headers);
  const fault = parseQuickBooksFault(input.json);
  const rawMessage =
    input.oauthErrorDescription ??
    input.oauthError ??
    fault?.detail ??
    fault?.message ??
    input.fallbackMessage;
  const message = redactSecretsForLog(rawMessage) ?? input.fallbackMessage;

  const logEntry = logQuickBooksError({
    operation: input.operation,
    httpStatus: input.res.status,
    intuitTid,
    realmId: input.realmId,
    faultCode: fault?.code,
    message,
    detail: fault?.detail ? redactSecretsForLog(fault.detail) : undefined,
    oauthError: input.oauthError ? redactSecretsForLog(input.oauthError) : undefined,
  });

  throw new QuickBooksApiError({
    operation: input.operation,
    httpStatus: input.res.status,
    message,
    intuitTid,
    logEntry,
  });
}
