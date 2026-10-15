import { bytesToBase64, signHmacSha256, timingSafeEqual } from "@exokortex/security";
import type { Env } from "./env.js";

const COOKIE = "exo_session";

export function sessionSecret(env: Env): string {
  return env.DEV_SESSION_SECRET || env.ENCRYPTION_KEY;
}

export async function seal(secret: string, payload: Record<string, unknown>): Promise<string> {
  const body = bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const signature = await signHmacSha256(secret, body);
  return `${body}.${signature.slice("sha256=".length)}`;
}

export async function open<T>(secret: string, token: string): Promise<T | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = (await signHmacSha256(secret, body)).slice("sha256=".length);
  if (!timingSafeEqual(expected, signature)) return null;
  const padded = body.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const json = new TextDecoder().decode(
    Uint8Array.from(atob(padded + pad), (char) => char.charCodeAt(0)),
  );
  return JSON.parse(json) as T;
}

export function readCookie(request: Request, name = COOKIE): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookie(token: string, maxAge: number): string {
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
