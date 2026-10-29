import type { CSSProperties } from "react";

export function Sculpture({ className = "" }: { className?: string }) {
  return (
    <div className={`sculpture ${className}`} aria-hidden="true">
      <div className="sculpture-ground" />
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className="sculpture-disc"
          style={{ "--slice": index } as CSSProperties}
        />
      ))}
      <span className="sculpture-center" />
    </div>
  );
}
