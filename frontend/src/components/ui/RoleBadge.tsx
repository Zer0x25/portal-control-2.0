import React from "react";
import { UserRole } from "../../types/index";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
  size?: "xs" | "sm" | "md";
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = "", size = "md" }) => {
  const getRoleStyles = (role: UserRole) => {
    const roles: Record<UserRole, { color: string; bg: string; border: string }> = {
      Administrador: {
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-900/10",
        border: "border-red-200 dark:border-red-900/30",
      },
      Supervisor_Elevado: {
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900/10",
        border: "border-purple-200 dark:border-purple-900/30",
      },
      Supervisor: {
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/10",
        border: "border-amber-200 dark:border-amber-900/30",
      },
      Reloj_Control: {
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/10",
        border: "border-blue-200 dark:border-blue-900/30",
      },
      Fiscalizador: {
        color: "text-teal-600 dark:text-teal-400",
        bg: "bg-teal-50 dark:bg-teal-900/10",
        border: "border-teal-200 dark:border-teal-900/30",
      },
      Usuario: {
        color: "text-slate-600 dark:text-slate-400",
        bg: "bg-slate-50 dark:bg-slate-900/10",
        border: "border-slate-200 dark:border-slate-900/30",
      },
      Archivado: {
        color: "text-gray-500",
        bg: "bg-gray-100 dark:bg-gray-800",
        border: "border-gray-200 dark:border-gray-700",
      },
    };

    return roles[role] || roles.Usuario;
  };

  const { color, bg, border } = getRoleStyles(role);

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[8px]",
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-3 py-1 text-[10px]",
  };

  return (
    <span
      className={`inline-flex items-center font-black uppercase tracking-widest border rounded-md shadow-sm transition-all ${bg} ${color} ${border} ${sizeClasses[size]} ${className}`}
    >
      <div className={`w-1 h-1 rounded-full mr-1.5 ${color.replace("text-", "bg-")}`} />
      {role}
    </span>
  );
};

export default RoleBadge;
