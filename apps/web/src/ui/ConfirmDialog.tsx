import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button.js";
import { Field, Input } from "./Field.js";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  requireText,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  requireText?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    setTyped("");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const blocked = requireText !== undefined && typed.trim() !== requireText;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="overlay"
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div key="dialog" className="dialog-wrap">
            <motion.div
              className="dialog"
              role="alertdialog"
              aria-modal="true"
              aria-label={title}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              <h2>{title}</h2>
              {children ? <div className="muted">{children}</div> : null}
              {requireText !== undefined ? (
                <div style={{ marginTop: 16 }}>
                  <Field label={`Type ${requireText} to confirm`}>
                    {(id) => (
                      <Input
                        id={id}
                        autoFocus
                        value={typed}
                        onChange={(event) => setTyped(event.target.value)}
                      />
                    )}
                  </Field>
                </div>
              ) : null}
              <div className="dialog-actions">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant={danger ? "danger" : "primary"}
                  loading={busy}
                  disabled={blocked}
                  autoFocus={requireText === undefined}
                  onClick={() => void confirm()}
                >
                  {confirmLabel}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
