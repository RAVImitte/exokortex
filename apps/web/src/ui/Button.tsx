import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
type Size = "md" | "sm";

interface Look {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  block?: boolean;
}

function classes({ variant = "secondary", size = "md", block }: Look, extra?: string): string {
  return ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : "", block ? "btn-block" : "", extra]
    .filter(Boolean)
    .join(" ");
}

function content(icon: LucideIcon | undefined, size: Size, loading: boolean, children: ReactNode) {
  const iconSize = size === "sm" ? 14 : 16;
  const Icon = loading ? LoaderCircle : icon;
  return (
    <>
      {Icon ? (
        <Icon size={iconSize} aria-hidden="true" className={loading ? "spinner" : undefined} />
      ) : null}
      {children}
    </>
  );
}

export function Button({
  variant,
  size = "md",
  icon,
  block,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Look & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      className={classes({ variant, size, block }, className)}
    >
      {content(icon, size, loading, children)}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  size = "md",
  variant = "ghost",
  className,
  ...rest
}: {
  icon: LucideIcon;
  label: string;
  size?: Size;
  variant?: Variant;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={classes({ variant, size }, `btn-icon ${className ?? ""}`)}
    >
      <Icon size={size === "sm" ? 15 : 18} aria-hidden="true" />
    </button>
  );
}

export function ButtonLink({
  variant,
  size = "md",
  icon,
  block,
  className,
  children,
  ...rest
}: Look & LinkProps) {
  return (
    <Link {...rest} className={classes({ variant, size, block }, className)}>
      {content(icon, size, false, children)}
    </Link>
  );
}

export function ButtonAnchor({
  variant,
  size = "md",
  icon,
  block,
  className,
  children,
  ...rest
}: Look & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...rest} className={classes({ variant, size, block }, className)}>
      {content(icon, size, false, children)}
    </a>
  );
}
