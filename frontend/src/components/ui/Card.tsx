import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  badge?: React.ReactNode;
  noPadding?: boolean;
  variant?: "default" | "premium" | "flat";
}

const Card = React.memo(
  React.forwardRef<HTMLDivElement, CardProps>(
    ({ children, className = "", title, badge, noPadding, variant = "default", ...rest }, ref) => {
      // Variants logic
      const isPremium = variant === "premium";
      const isFlat = variant === "flat";

      const paddingClass = noPadding ? "" : isPremium ? "p-6 md:p-8" : "p-5";

      const baseClasses = `relative ${className}`;
      const borderClasses = isFlat
        ? ""
        : "bg-token-surface-card border border-token-border-technical shadow-sm rounded-md overflow-hidden";

      return (
        <motion.div
          ref={ref}
          {...rest}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className={`${baseClasses} ${borderClasses}`}
        >
          {title && (
            <div className="px-5 py-3 border-b border-token-border-technical bg-token-surface-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-3 bg-sap-blue rounded-sm" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-token-text-primary leading-none">
                  {title}
                </h3>
              </div>
              {badge && <div className="flex-shrink-0">{badge}</div>}
            </div>
          )}
          <div className={`${paddingClass} text-token-text-primary h-full`}>{children}</div>
        </motion.div>
      );
    },
  ),
);

export default Card;
