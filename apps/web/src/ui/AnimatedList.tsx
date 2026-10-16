import { AnimatePresence, motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const list: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};

export function AnimatedList({
  className = "list",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.ul className={className} variants={list} initial="hidden" animate="shown">
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </motion.ul>
  );
}

export function AnimatedItem({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.li className={className} variants={item} exit="exit" layout="position">
      {children}
    </motion.li>
  );
}

export function AnimatedGrid({ className, children }: { className: string; children: ReactNode }) {
  return (
    <motion.div className={className} variants={list} initial="hidden" animate="shown">
      {children}
    </motion.div>
  );
}

export function AnimatedCell({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={item} style={{ display: "grid" }}>
      {children}
    </motion.div>
  );
}
