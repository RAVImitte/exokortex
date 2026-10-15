export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!response.ok) {
    throw new ApiError(body?.error?.message ?? response.statusText, response.status);
  }
  return body as T;
}
