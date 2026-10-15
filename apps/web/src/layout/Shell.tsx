import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import type { Me } from "../api/types.js";

const links = [
  ["/dashboard", "Dashboard"],
  ["/repositories", "Repositories"],
  ["/connections", "Connections"],
  ["/activity", "Activity"],
  ["/ai", "AI"],
  ["/settings", "Settings"],
  ["/projects", "Projects"],
  ["/approvals", "Approvals"],
] as const;

export function Shell({ me, children }: { me?: Me; children: ReactNode }) {
  return (
    <div className="shell">
      <nav>
        <strong>ExoKortex</strong>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
        <SignOut />
        {me ? <p className="muted">{me.email}</p> : null}
      </nav>
      <main>{children}</main>
    </div>
  );
}

function SignOut() {
  const navigate = useNavigate();
  return (
    <button
      className="ghost"
      type="button"
      onClick={() => {
        void api("/api/logout", { method: "POST" }).then(() => navigate(0));
      }}
    >
      Sign out
    </button>
  );
}
