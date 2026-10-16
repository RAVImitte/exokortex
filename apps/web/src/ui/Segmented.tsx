import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const layoutId = useId();
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            className="segmented-item"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="segmented-thumb"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            ) : null}
            <span>
              {Icon ? <Icon size={14} /> : null}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
