import { createClerkClient } from "@clerk/backend";
import { AppError, primaryEmail } from "@exokortex/shared";
import type { Env } from "./env.js";
import { open, readCookie, sessionSecret } from "./session.js";

export interface AuthIdentity {
  subject: string;
  email: string;
}

export async function identify(env: Env, request: Request): Promise<AuthIdentity | null> {
  if (env.AUTH_MODE === "dev") {
    if (env.ENVIRONMENT !== "development") {
      throw new AppError("auth_mode", "Dev login is only available in development", 500);
    }
    const token = readCookie(request);
    if (!token) return null;
    const payload = await open<{ sub?: string; email?: string; exp?: number }>(
      sessionSecret(env),
      token,
    );
    if (!payload?.sub || !payload.exp || payload.exp * 1000 < Date.now()) return null;
    return { subject: payload.sub, email: payload.email ?? payload.sub };
  }
  if (!env.CLERK_SECRET_KEY) return null;
  const clerk = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });
  const parties = clerkAuthorizedParties(env, request);
  const state = await clerk.authenticateRequest(
    request,
    parties ? { authorizedParties: parties } : {},
  );
  if (!state.isAuthenticated) return null;
  const auth = state.toAuth();
  if (!auth?.userId) return null;
  const user = await clerk.users.getUser(auth.userId);
  return {
    subject: auth.userId,
    email: primaryEmail({
      fallback: auth.userId,
      primaryId: user.primaryEmailAddressId,
      addresses: user.emailAddresses,
    }),
  };
}

function clerkAuthorizedParties(env: Env, request: Request): string[] | undefined {
  const parties = new Set<string>();
  if (env.APP_BASE_URL) parties.add(env.APP_BASE_URL);
  if (env.ENVIRONMENT === "development") {
    const local = localPageOrigin(request);
    if (local) parties.add(local);
  }
  return parties.size > 0 ? [...parties] : undefined;
}

export function pageOrigin(env: Env, request: Request): string {
  if (env.ENVIRONMENT === "development") {
    const local = localPageOrigin(request);
    if (local) return local;
  }
  return env.APP_BASE_URL ?? "";
}

function localPageOrigin(request: Request): string | null {
  for (const header of ["Origin", "Referer"]) {
    const value = request.headers.get(header);
    if (!value) continue;
    try {
      const url = new URL(value);
      const host = url.hostname;
      if (url.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) {
        return url.origin;
      }
    } catch {
      continue;
    }
  }
  return null;
}
