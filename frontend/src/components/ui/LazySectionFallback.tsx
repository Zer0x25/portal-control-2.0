import React from "react";
import Skeleton from "./Skeleton";

interface LazySectionFallbackProps {
  rows?: number;
  className?: string;
}

const LazySectionFallback: React.FC<LazySectionFallbackProps> = ({ rows = 4, className = "" }) => {
  const totalRows = Math.max(1, rows);

  return (
    <div className={`space-y-4 py-4 ${className}`}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: totalRows }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
};

export default LazySectionFallback;
