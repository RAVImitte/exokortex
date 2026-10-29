import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { Me } from "../api/types.js";
import { IconButton } from "../ui/Button.js";
import { Brand } from "./Brand.js";
import { Sidebar, ThemeToggle } from "./Sidebar.js";

export function MobileNav({
  me,
  account,
  onSignOut,
}: {
  me?: Me;
  account?: ReactNode;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const background = Array.from(document.querySelectorAll<HTMLElement>(".main, .topbar"));
    const previousInert = background.map((element) => element.inert);
    background.forEach((element) => {
      element.inert = true;
    });
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const controls = drawerRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        );
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      background.forEach((element, index) => {
        element.inert = previousInert[index] ?? false;
      });
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      <header className="topbar">
        <IconButton
          icon={Menu}
          label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(true)}
        />
        <Brand />
        <div className="topbar-end">
          <ThemeToggle />
        </div>
      </header>
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="overlay"
              className="overlay"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="drawer"
              className="drawer"
              id="mobile-navigation"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            >
              <Sidebar
                me={me}
                account={account}
                onSignOut={onSignOut}
                indicatorId="nav-indicator-mobile"
              />
              <IconButton
                className="drawer-close"
                icon={X}
                label="Close menu"
                size="sm"
                onClick={() => setOpen(false)}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
