import { base64ToBytes, bytesToBase64 } from "./encoding.js";

export async function importAesKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToBytes(base64Key);
  if (raw.byteLength !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptString(
  key: CryptoKey,
  plaintext: string,
  version = 1,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)),
  );
  return `v${version}:${bytesToBase64(iv)}:${bytesToBase64(cipher)}`;
}

export async function decryptString(key: CryptoKey, payload: string): Promise<string> {
  const parts = payload.split(":");
  if (parts.length !== 3 || !parts[1] || !parts[2]) {
    throw new Error("ciphertext is malformed");
  }
  const iv = base64ToBytes(parts[1]);
  const cipher = base64ToBytes(parts[2]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

export function randomKeyBase64(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
}
