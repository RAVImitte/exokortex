import { MotionConfig } from "motion/react";
import { lazy, Suspense, useEffect, useState } from "react";
import { api } from "./api/client.js";
import type { Me } from "./api/types.js";
import { Shell } from "./layout/Shell.js";
import { LoginPage } from "./pages/LoginPage.js";
import { AppRoutes, Loading } from "./routes.js";
import { ToastProvider } from "./ui/Toast.js";

const authMode = import.meta.env.VITE_AUTH_MODE ?? "dev";
const ClerkApp = lazy(() => import("./ClerkApp.js"));

export default function WorkspaceApp() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        {authMode === "clerk" ? (
          <Suspense fallback={<Loading />}>
            <ClerkApp />
          </Suspense>
        ) : (
          <DevApp />
        )}
      </ToastProvider>
    </MotionConfig>
  );
}

function DevApp() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    api<Me>("/api/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  if (me === undefined) return <Loading />;
  if (!me) return <LoginPage onDone={setMe} />;
  return (
    <Shell me={me}>
      <AppRoutes />
    </Shell>
  );
}
