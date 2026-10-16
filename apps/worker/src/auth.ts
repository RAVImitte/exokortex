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
  const state = await clerk.authenticateRequest(
    request,
    env.APP_BASE_URL ? { authorizedParties: [env.APP_BASE_URL] } : {},
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
