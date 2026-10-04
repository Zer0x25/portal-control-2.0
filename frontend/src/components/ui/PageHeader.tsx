import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Standard application page header.
 * Reusable across pages with optional eyebrow, icon and actions.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  className = "",
  eyebrow,
  eyebrowIcon,
  icon,
  actions,
}) => {
  const showEyebrow = Boolean(eyebrow);

  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ${className}`}>
      <div className="flex flex-col gap-1">
        {showEyebrow && (
          <div className="flex items-center gap-2 mb-1.5">
            {eyebrowIcon && <span className="opacity-70 text-sap-blue">{eyebrowIcon}</span>}
            <p className="text-[11px] font-bold text-sap-blue tracking-wide uppercase">{eyebrow}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-10 h-10 rounded-sm bg-sap-blue flex items-center justify-center text-white shrink-0 shadow-sm">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black text-token-text-primary uppercase tracking-tighter">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-widest mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div
          className="flex items-center gap-3 w-full md:w-auto overflow-x-auto scrollbar-hide"
          tabIndex={0}
        >
          {actions}
        </div>
      )}
    </div>
  );
};

const sameHeaderNode = (a?: React.ReactNode, b?: React.ReactNode): boolean => {
  if (Object.is(a, b)) return true;
  if (!React.isValidElement(a) || !React.isValidElement(b)) return false;
  const aProps = a.props as { className?: string } | undefined;
  const bProps = b.props as { className?: string } | undefined;
  return a.type === b.type && aProps?.className === bProps?.className;
};

export default React.memo(PageHeader, (prev, next) => {
  return (
    prev.title === next.title &&
    prev.subtitle === next.subtitle &&
    prev.className === next.className &&
    prev.eyebrow === next.eyebrow &&
    sameHeaderNode(prev.eyebrowIcon, next.eyebrowIcon) &&
    sameHeaderNode(prev.icon, next.icon) &&
    Object.is(prev.actions, next.actions)
  );
});
