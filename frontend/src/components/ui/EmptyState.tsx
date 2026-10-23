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
      data-testid="empty-state"
      className={`@container flex flex-col items-center justify-center py-10 px-5 @sm:py-16 @sm:px-8 text-center rounded-md border border-dashed border-token-border-technical bg-token-surface-stripe ${className}`}
    >
      {icon && <IconBox icon={icon} variant="neutral" size="lg" className="mb-6 opacity-50" />}
      <h3 className="text-base @sm:text-lg font-black text-token-text-primary uppercase tracking-tight mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-xs font-bold text-token-text-secondary max-w-xs mb-8 uppercase tracking-wide">
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
