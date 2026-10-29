import { ArrowUpRight, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import type { Me } from "../api/types.js";
import { useDashboard } from "../hooks/useDashboard.js";
import { IconButton } from "../ui/Button.js";
import { Brand } from "./Brand.js";
import { navSections } from "./nav.js";
import { ThemeToggle } from "./ThemeToggle.js";
export { ThemeToggle } from "./ThemeToggle.js";

export function Sidebar({
  me,
  account,
  onSignOut,
  indicatorId,
}: {
  me?: Me;
  account?: ReactNode;
  onSignOut: () => void;
  indicatorId: string;
}) {
  const { data } = useDashboard();
  const pending = data?.pendingApprovals ?? 0;

  return (
    <aside className="sidebar">
      <Brand />
      <nav className="nav" aria-label="Main">
        {navSections.map((section) => (
          <div key={section.label} className="nav-section">
            <div className="nav-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className="nav-item">
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <motion.span
                          layoutId={indicatorId}
                          className="nav-indicator"
                          transition={{ type: "spring", stiffness: 520, damping: 40 }}
                        />
                      ) : null}
                      <Icon size={17} />
                      <span>{item.label}</span>
                      <AnimatePresence>
                        {item.badge === "approvals" && pending > 0 ? (
                          <motion.span
                            key="badge"
                            className="nav-badge"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 28 }}
                          >
                            {pending}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <Link className="sidebar-studio" to="/projects">
        <span className="sidebar-studio-mark">↗</span>
        <strong>A living body of work.</strong>
        <p>Your progress, thoughtfully collected.</p>
        <span>
          View your projects <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </Link>
      <div className="sidebar-footer">
        <div className="account">
          {account ?? <span className="avatar">{me?.email.slice(0, 1) ?? "?"}</span>}
          <span className="account-email" title={me?.email}>
            {me?.email ?? ""}
          </span>
          <ThemeToggle />
          <IconButton icon={LogOut} label="Sign out" size="sm" onClick={onSignOut} />
        </div>
      </div>
    </aside>
  );
}
