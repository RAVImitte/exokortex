export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

export function primaryEmail(input: {
  fallback: string;
  primaryId?: string | null;
  addresses?: { id: string; emailAddress: string }[];
}): string {
  const addresses = input.addresses ?? [];
  const primary = addresses.find((item) => item.id === input.primaryId);
  return primary?.emailAddress || addresses[0]?.emailAddress || input.fallback;
}

const SECRET_FIELD = /api[_-]?key|token|secret|authorization|password|credential|cookie/i;

export function redact(fields: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = SECRET_FIELD.test(key) ? "[redacted]" : value;
  }
  return safe;
}

export function log(
  level: "info" | "warn" | "error",
  message: string,
  fields: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      level,
      message,
      ts: new Date().toISOString(),
      ...redact(fields),
    }),
  );
}
