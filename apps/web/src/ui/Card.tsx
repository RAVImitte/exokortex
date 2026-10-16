import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

export function Card({
  to,
  className,
  children,
  ...rest
}: { to?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  if (to) {
    return (
      <Link to={to} className={`card card-interactive ${className ?? ""}`}>
        {children}
      </Link>
    );
  }
  return (
    <div {...rest} className={`card ${className ?? ""}`}>
      {children}
    </div>
  );
}
