import {
  ClerkProvider,
  SignIn,
  SignedIn,
  SignedOut,
  useAuth,
  UserButton,
} from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { api, setSessionToken } from "./api/client.js";
import type { Me } from "./api/types.js";
import { Brand } from "./layout/Brand.js";
import { Shell } from "./layout/Shell.js";
import { AuthLayout } from "./pages/LoginPage.js";
import { AppRoutes, Loading } from "./routes.js";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";

export default function ClerkApp() {
  if (!clerkKey) {
    return (
      <AuthLayout>
        <p className="muted">Set VITE_CLERK_PUBLISHABLE_KEY to use Clerk.</p>
      </AuthLayout>
    );
  }
  return (
    <ClerkProvider publishableKey={clerkKey}>
      <SignedOut>
        <div className="auth">
          <div className="auth-glow auth-glow-1" />
          <div className="auth-glow auth-glow-2" />
          <div className="auth-clerk">
            <Brand />
            <SignIn routing="hash" />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <ClerkSession />
      </SignedIn>
    </ClerkProvider>
  );
}

function ClerkSession() {
  const { getToken, signOut } = useAuth();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  setSessionToken(() => getToken());
  useEffect(() => () => setSessionToken(null), []);
  useEffect(() => {
    api<Me>("/api/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, [getToken]);
  if (me === undefined) return <Loading />;
  return (
    <Shell
      me={me ?? undefined}
      account={<UserButton />}
      onSignOut={() => {
        void signOut();
      }}
    >
      {me === null ? <p className="error-text">Sign-in could not be verified.</p> : <AppRoutes />}
    </Shell>
  );
}
