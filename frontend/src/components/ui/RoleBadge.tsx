import React from "react";
import { UserRole } from "../../types/index";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
  size?: "xs" | "sm" | "md";
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = "", size = "md" }) => {
  const getRoleStyles = (role: UserRole) => {
    const roles: Record<UserRole, { color: string; bg: string; border: string; dot: string }> = {
      Administrador: {
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-900/10",
        border: "border-red-200 dark:border-red-900/30",
        dot: "bg-red-600 dark:bg-red-400",
      },
      Supervisor_Elevado: {
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900/10",
        border: "border-purple-200 dark:border-purple-900/30",
        dot: "bg-purple-600 dark:bg-purple-400",
      },
      Supervisor: {
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/10",
        border: "border-amber-200 dark:border-amber-900/30",
        dot: "bg-amber-600 dark:bg-amber-400",
      },
      Reloj_Control: {
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/10",
        border: "border-blue-200 dark:border-blue-900/30",
        dot: "bg-blue-600 dark:bg-blue-400",
      },
      Fiscalizador: {
        color: "text-teal-600 dark:text-teal-400",
        bg: "bg-teal-50 dark:bg-teal-900/10",
        border: "border-teal-200 dark:border-teal-900/30",
        dot: "bg-teal-600 dark:bg-teal-400",
      },
      Usuario: {
        color: "text-token-text-secondary",
        bg: "bg-token-surface-stripe",
        border: "border-token-border-subtle",
        dot: "bg-token-accent-brand",
      },
      Archivado: {
        color: "text-token-text-tertiary",
        bg: "bg-token-surface-technical",
        border: "border-token-border-subtle",
        dot: "bg-token-text-tertiary",
      },
    };

    return roles[role] || roles.Usuario;
  };

  const { color, bg, border, dot } = getRoleStyles(role);

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[8px]",
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-3 py-1 text-[10px]",
  };

  return (
    <span
      className={`inline-flex items-center font-black uppercase tracking-widest border rounded-md shadow-sm transition-all ${bg} ${color} ${border} ${sizeClasses[size]} ${className}`}
    >
      <div className={`w-1 h-1 rounded-full mr-1.5 ${dot}`} />
      {role}
    </span>
  );
};

export default RoleBadge;
