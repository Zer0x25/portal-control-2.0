import React from "react";
import { UserRole } from "../../types/index";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
  size?: "xs" | "sm" | "md";
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = "", size = "md" }) => {
  const getRoleStyles = (role: UserRole) => {
    // Paleta categorica del design system (--chart-N): los roles son
    // categorias, no estados semanticos, asi que no usan --status-*.
    const roles: Record<UserRole, { color: string; bg: string; border: string; dot: string }> = {
      Administrador: {
        color: "text-token-chart-6",
        bg: "bg-token-chart-6/10",
        border: "border-token-chart-6/30",
        dot: "bg-token-chart-6",
      },
      Supervisor_Elevado: {
        color: "text-token-chart-5",
        bg: "bg-token-chart-5/10",
        border: "border-token-chart-5/30",
        dot: "bg-token-chart-5",
      },
      Supervisor: {
        color: "text-token-chart-4",
        bg: "bg-token-chart-4/10",
        border: "border-token-chart-4/30",
        dot: "bg-token-chart-4",
      },
      Reloj_Control: {
        color: "text-token-chart-2",
        bg: "bg-token-chart-2/10",
        border: "border-token-chart-2/30",
        dot: "bg-token-chart-2",
      },
      Fiscalizador: {
        color: "text-token-chart-7",
        bg: "bg-token-chart-7/10",
        border: "border-token-chart-7/30",
        dot: "bg-token-chart-7",
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
