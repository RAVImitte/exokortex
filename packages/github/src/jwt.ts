import { bytesToBase64, pemToDer } from "@exokortex/security";

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

export async function createAppJwt(
  appId: string,
  privateKeyPem: string,
  now = new Date(),
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000) - 60;
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({ iat, exp: iat + 9 * 60, iss: appId });
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Bytes(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${payload}`),
    ),
  );
  return `${header}.${payload}.${base64Url(signature)}`;
}

function pkcs8Bytes(privateKeyPem: string): BufferSource {
  const der = new Uint8Array(pemToDer(privateKeyPem));
  return privateKeyPem.includes("BEGIN RSA PRIVATE KEY") ? pkcs1ToPkcs8(der) : der;
}

function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = Uint8Array.of(0x02, 0x01, 0x00);
  const algorithm = Uint8Array.of(
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  );
  return sequence(concat([version, algorithm, tagged(0x04, pkcs1)]));
}

function sequence(content: Uint8Array): Uint8Array {
  return tagged(0x30, content);
}

function tagged(tag: number, content: Uint8Array): Uint8Array {
  const length = lengthBytes(content.length);
  const out = new Uint8Array(1 + length.length + content.length);
  out[0] = tag;
  out.set(length, 1);
  out.set(content, 1 + length.length);
  return out;
}

function lengthBytes(length: number): Uint8Array {
  if (length < 128) return Uint8Array.of(length);
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
