export function Skeleton({
  width = "100%",
  height = 16,
  radius,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
}) {
  return (
    <div className="skeleton" aria-hidden="true" style={{ width, height, borderRadius: radius }} />
  );
}

export function SkeletonCards({ count = 3, height = 96 }: { count?: number; height?: number }) {
  return (
    <div className="list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={height} radius={14} />
      ))}
    </div>
  );
}
