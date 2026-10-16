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
  return (
    <div className="shell">
      <nav>
        <strong>ExoKortex</strong>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
        <SignOut onSignOut={onSignOut} />
        {account}
        {me ? <p className="muted">{me.email}</p> : null}
      </nav>
      <main>{children}</main>
    </div>
  );
}

function SignOut({ onSignOut }: { onSignOut?: () => void }) {
  const navigate = useNavigate();
  return (
    <button
      className="ghost"
      type="button"
      onClick={() => {
        if (onSignOut) {
          onSignOut();
          return;
        }
        void api("/api/logout", { method: "POST" }).then(() => navigate(0));
      }}
    >
      Sign out
    </button>
  );
}
