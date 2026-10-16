import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { Me } from "../api/types.js";
import { useDashboard } from "../hooks/useDashboard.js";
import { useTheme, type ThemeChoice } from "../theme.js";
import { IconButton } from "../ui/Button.js";
import { Brand } from "./Brand.js";
import { navSections } from "./nav.js";

const nextTheme: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const themeIcon = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  return (
    <IconButton
      icon={themeIcon[choice]}
      label={`Theme: ${choice}. Switch to ${nextTheme[choice]}`}
      size="sm"
      onClick={() => setChoice(nextTheme[choice])}
    />
  );
}

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
