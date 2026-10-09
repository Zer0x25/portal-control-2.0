import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = "", width, height, circle = false }) => {
  const styles: React.CSSProperties = {};
  if (width) styles.width = width;
  if (height) styles.height = height;

  return (
    <div
      className={`
        animate-pulse bg-token-surface-technical 
        ${circle ? "rounded-full" : "rounded-md"}
        ${className}
      `}
      style={styles}
    />
  );
};

export default Skeleton;
