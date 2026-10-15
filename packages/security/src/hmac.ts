import { bytesToHex, timingSafeEqual } from "./encoding.js";

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function signHmacSha256(secret: string, body: string): Promise<string> {
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(body)),
  );
  return `sha256=${bytesToHex(signature)}`;
}

export async function verifyHmacSha256(
  secret: string,
  body: string,
  header: string | null,
): Promise<boolean> {
  if (!header) return false;
  const expected = await signHmacSha256(secret, body);
  return timingSafeEqual(expected, header);
}
