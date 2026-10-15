import type { ZodType } from "zod";

export function parseJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? trimmed;
  return JSON.parse(body);
}

export async function parseAgentOutput<T>(
  schema: ZodType<T>,
  raw: string,
  retry: (error: string) => Promise<string>,
): Promise<T> {
  const first = validate(schema, raw);
  if (first.ok) return first.value;
  const secondRaw = await retry(first.error);
  const second = validate(schema, secondRaw);
  if (!second.ok) {
    throw new Error(`agent output failed validation: ${second.error}`);
  }
  return second.value;
}

function validate<T>(
  schema: ZodType<T>,
  raw: string,
): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const parsed = schema.safeParse(parseJson(raw));
    if (parsed.success) return { ok: true, value: parsed.data };
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "invalid JSON" };
  }
}
