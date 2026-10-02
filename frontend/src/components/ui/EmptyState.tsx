import React from "react";
import Button from "./Button";
import IconBox from "./IconBox";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-8 text-center rounded-md border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 ${className}`}
    >
      {icon && <IconBox icon={icon} variant="neutral" size="lg" className="mb-6 opacity-40" />}
      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-xs font-bold text-slate-500 dark:text-gray-500 max-w-xs mb-8 uppercase tracking-wide">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary" size="sm" className="px-8 h-10">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
