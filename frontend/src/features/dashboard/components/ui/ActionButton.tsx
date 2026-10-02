import React, { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { ActionConfig, ToolConfig, ColorTheme } from "../../types";

interface BaseActionButtonProps {
  color: ColorTheme;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className?: string;
  hasNotification?: boolean;
  disabled?: boolean;
}

interface ClickableActionButtonProps extends BaseActionButtonProps {
  onClick: () => void;
}

interface LinkActionButtonProps extends BaseActionButtonProps {
  href: string;
  target?: string;
  rel?: string;
}

type ActionButtonProps = ClickableActionButtonProps | LinkActionButtonProps;

/**
 * Componente reutilizable para botones de acción en el dashboard
 * Soporta tanto clicks como enlaces, con indicadores de notificación
 * Optimizado con React.memo para prevenir re-renders innecesarios
 */
export const ActionButton: React.FC<ActionButtonProps> = React.memo((props) => {
  const { color, icon: Icon, label, className = "", hasNotification, disabled } = props;

  // Memoizar clases de color para evitar recálculos
  const colorClasses = useMemo(
    () => ({
      emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
      slate: "text-slate-600 dark:text-gray-400 bg-gray-500/10",
      orange: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
      violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    }),
    [],
  );

  // Memoizar clases base para evitar concatenaciones en cada render
  const baseClasses = useMemo(
    () => `
    group relative p-3.5 h-[90px] rounded-sm flex flex-col items-center justify-center text-center
    bg-token-surface-stripe border border-token-border-technical shadow-sm transition-all duration-150
    hover:border-sap-blue/40 hover:bg-token-surface-active active:scale-[0.98]
    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    ${colorClasses[color]}
    ${className}
  `,
    [color, className, disabled, colorClasses],
  );

  // Memoizar clases del icono
  const iconBoxClasses = useMemo(
    () => `
    w-8 h-8 rounded-sm flex items-center justify-center mb-2.5 transition-transform
    group-hover:scale-110 border border-token-border-technical/50
  `,
    [],
  );

  const content = useMemo(
    () => (
      <>
        {hasNotification && (
          <span className="absolute top-3 right-3 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
          </span>
        )}
        <motion.div
          className={iconBoxClasses}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
        <span className="text-xs font-bold text-token-text-secondary uppercase tracking-wider leading-none">
          {label}
        </span>
      </>
    ),
    [hasNotification, iconBoxClasses, Icon, label],
  );

  if ("href" in props) {
    const { href, target = "_blank", rel = "noopener noreferrer" } = props;
    return (
      <motion.a
        href={href}
        target={target}
        rel={rel}
        className={baseClasses}
        whileHover={{ y: -2 }}
        whileTap={{ y: 0 }}
      >
        {content}
      </motion.a>
    );
  }

  const { onClick } = props;
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
    >
      {content}
    </motion.button>
  );
});

ActionButton.displayName = "ActionButton";

/**
 * Hook helper para crear props de ActionButton desde ActionConfig
 * Optimizado con useMemo para prevenir recálculos innecesarios
 */
export const useActionButtonProps = (action: ActionConfig): ClickableActionButtonProps => {
  return useMemo(
    () => ({
      color: action.color,
      icon: action.icon,
      label: action.label,
      onClick: () => {}, // Será sobrescrito por el componente padre
    }),
    [action.color, action.icon, action.label],
  );
};

/**
 * Hook helper para crear props de ActionButton desde ToolConfig
 * Optimizado con useMemo y useCallback para máxima performance
 */
export const useToolButtonProps = (tool: ToolConfig): ActionButtonProps => {
  const baseProps = useMemo(
    () => ({
      color: tool.color,
      icon: tool.icon,
      label: tool.label,
      hasNotification: tool.hasNotification,
    }),
    [tool.color, tool.icon, tool.label, tool.hasNotification],
  );

  const onClick = useCallback(() => {
    if (tool.type === "button" && typeof tool.action === "function") {
      tool.action();
    }
  }, [tool.type, tool.action]);

  if (tool.type === "link") {
    return useMemo(
      () => ({
        ...baseProps,
        href: tool.action as string,
      }),
      [baseProps, tool.action],
    );
  }

  return useMemo(
    () => ({
      ...baseProps,
      onClick,
    }),
    [baseProps, onClick],
  );
};
