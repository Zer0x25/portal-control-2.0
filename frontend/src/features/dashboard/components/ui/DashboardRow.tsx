import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface DashboardRowProps {
  icon?: ReactNode;
  initial?: string;
  title: string;
  subtitle: string;
  extra?: ReactNode;
  indicator?: ReactNode;
  onDoubleClick?: () => void;
  onClick?: () => void;
  className?: string;
  variant?: "stripe" | "card";
  showAnimation?: boolean;
  animationDelay?: number;
}

/**
 * Componente mejorado para filas del dashboard con animaciones y tipos consistentes
 */
const DashboardRow: React.FC<DashboardRowProps> = ({
  icon,
  initial,
  title,
  subtitle,
  extra,
  indicator,
  onDoubleClick,
  onClick,
  className = "",
  variant = "stripe",
  showAnimation = true,
  animationDelay = 0,
}) => {
  const bgClass = variant === "stripe" ? "bg-token-surface-stripe" : "bg-token-surface-card";

  const content = (
    <div
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      className={`
        flex items-center justify-between p-3.5 rounded-sm border border-token-border-technical
        cursor-pointer transition-all group hover:border-sap-blue/40 ${bgClass} ${className}
      `}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {icon ? (
          <div className="w-8 h-8 rounded-sm bg-token-surface-active flex items-center justify-center text-token-text-secondary">
            {icon}
          </div>
        ) : initial ? (
          <div className="w-8 h-8 rounded-sm bg-token-surface-active flex items-center justify-center font-bold text-token-text-secondary text-xs">
            {initial}
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-token-text-primary truncate leading-tight">
            {title}
          </p>
          <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest leading-none">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        {extra && <div className="text-right">{extra}</div>}
        {indicator && <div className="flex items-center">{indicator}</div>}
      </div>
    </div>
  );

  if (!showAnimation) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: animationDelay,
        ease: "easeOut",
      }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {content}
    </motion.div>
  );
};

export default DashboardRow;
