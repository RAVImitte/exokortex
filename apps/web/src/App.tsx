import { ClerkProvider, SignIn, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api/client.js";
import type { Me } from "./api/types.js";
import { Shell } from "./layout/Shell.js";
import { ActivityPage } from "./pages/ActivityPage.js";
import { AiPage } from "./pages/AiPage.js";
import { ConnectionsPage } from "./pages/ConnectionsPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { PlannedPage } from "./pages/PlannedPage.js";
import { RepositoriesPage } from "./pages/RepositoriesPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

const authMode = import.meta.env.VITE_AUTH_MODE ?? "dev";
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";

export function App() {
  if (authMode === "clerk") return <ClerkApp />;
  return <DevApp />;
}

function ClerkApp() {
  if (!clerkKey) return <p className="login">Set VITE_CLERK_PUBLISHABLE_KEY to use Clerk.</p>;
  return (
    <ClerkProvider publishableKey={clerkKey}>
      <SignedOut>
        <div className="login">
          <h1>ExoKortex</h1>
          <SignIn routing="hash" />
        </div>
      </SignedOut>
      <SignedIn>
        <Shell>
          <UserButton />
          <AppRoutes />
        </Shell>
      </SignedIn>
    </ClerkProvider>
  );
}

function DevApp() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    api<Me>("/api/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  if (me === undefined) return <p className="login">Loading…</p>;
  if (!me) return <LoginPage onDone={setMe} />;
  return (
    <Shell me={me}>
      <AppRoutes />
    </Shell>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/repositories" element={<RepositoriesPage />} />
      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/ai" element={<AiPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/projects" element={<PlannedPage title="Projects" />} />
      <Route path="/approvals" element={<PlannedPage title="Approvals" />} />
    </Routes>
  );
}
