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
    pemToDer(privateKeyPem),
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
