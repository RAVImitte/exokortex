import type { LucideIcon } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";
import { Card } from "./Card.js";

function CountUp({ value }: { value: number }) {
  const reducedMotion = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());
  useEffect(() => {
    const controls = animate(count, value, {
      duration: reducedMotion ? 0 : 0.8,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [count, value, reducedMotion]);
  return <motion.span>{rounded}</motion.span>;
}

export function Stat({
  label,
  value,
  icon: Icon,
  to,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  to?: string;
}) {
  return (
    <Card to={to} className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <div className={typeof value === "number" ? "stat-value" : "stat-value stat-value-sm"}>
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>
    </Card>
  );
}
