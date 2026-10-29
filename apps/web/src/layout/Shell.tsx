import type { ReactNode } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import type { Me } from "../api/types.js";
import { DashboardProvider } from "../hooks/useDashboard.js";
import { MobileNav } from "./MobileNav.js";
import { Sidebar } from "./Sidebar.js";
import { navSections } from "./nav.js";

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
  const { pathname } = useLocation();
  const current =
    navSections.flatMap((section) => section.items).find((item) => item.to === pathname)?.label ??
    "Workspace";
  const signOut =
    onSignOut ??
    (() => {
      void api("/api/logout", { method: "POST" }).then(() => navigate(0));
    });

  return (
    <DashboardProvider>
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <div className="app">
        <Sidebar me={me} account={account} onSignOut={signOut} indicatorId="nav-indicator" />
        <MobileNav me={me} account={account} onSignOut={signOut} />
        <main className="main" id="workspace-content">
          <div className="workspace-bar">
            <div>
              <span>Workspace</span>
              <ChevronRight size={13} aria-hidden="true" />
              <strong>{current}</strong>
            </div>
            <Link to="/">
              Visit website <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="page">{children}</div>
        </main>
      </div>
    </DashboardProvider>
  );
}
