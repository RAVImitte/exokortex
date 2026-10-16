import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import type { Me } from "../api/types.js";
import { DashboardProvider } from "../hooks/useDashboard.js";
import { MobileNav } from "./MobileNav.js";
import { Sidebar } from "./Sidebar.js";

export function Shell({
  me,
  children,
  account,
  onSignOut,
}: {
  me?: Me;
  children: ReactNode;
  account?: ReactNode;
  onSignOut?: () => void;
}) {
  const navigate = useNavigate();
  const signOut =
    onSignOut ??
    (() => {
      void api("/api/logout", { method: "POST" }).then(() => navigate(0));
    });

  return (
    <DashboardProvider>
      <div className="app">
        <Sidebar me={me} account={account} onSignOut={signOut} indicatorId="nav-indicator" />
        <MobileNav me={me} account={account} onSignOut={signOut} />
        <main className="main">
          <div className="page">{children}</div>
        </main>
      </div>
    </DashboardProvider>
  );
}
