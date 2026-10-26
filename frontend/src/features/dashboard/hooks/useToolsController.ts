import { useNavigate } from "react-router";
import { ROUTES } from "../../../constants";
import {
  ClipboardIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CalculatorIcon,
} from "../../../components/ui/icons/index";
import { ToolConfig, ColorTheme } from "../types";

export const useToolsController = (onOpenQuickNotes: () => void, hasUnreadNotes: boolean) => {
  const navigate = useNavigate();
  // El endpoint de metadata siempre devuelve esta ruta fija; evitar la lectura
  // en el arranque mantiene el enlace del reglamento sin trabajo de red extra.
  const policyUrl =
    import.meta.env.VITE_COMPANY_POLICY_URL || "/api/configs/public/company-policy/file";

  const tools: ToolConfig[] = [
    {
      id: "communications",
      label: "Comunicados",
      icon: ClipboardIcon,
      action: () => navigate(ROUTES.COMMUNICATIONS),
      color: "orange" as ColorTheme,
      type: "button" as const,
    },
    {
      id: "notes",
      label: "Notas",
      icon: ChatBubbleLeftRightIcon,
      action: onOpenQuickNotes,
      color: "emerald" as ColorTheme,
      type: "button" as const,
      hasNotification: hasUnreadNotes,
    },
    {
      id: "reglamento",
      label: "Reglamento",
      icon: DocumentTextIcon,
      action: policyUrl,
      color: "indigo" as ColorTheme,
      type: "link" as const,
    },
    {
      id: "meters",
      label: "Medidores",
      icon: CalculatorIcon,
      action: () => navigate(ROUTES.METER_READINGS),
      color: "violet" as ColorTheme,
      type: "button" as const,
    },
  ];

  const colorClasses: Record<string, string> = {
    orange: "bg-orange-600/10 text-orange-600",
    emerald: "bg-emerald-600/10 text-emerald-600",
    indigo: "bg-indigo-600/10 text-indigo-600",
    violet: "bg-violet-600/10 text-violet-600",
  };

  const itemClass =
    "group relative p-3.5 h-[90px] rounded-sm flex flex-col items-center justify-center text-center bg-token-surface-stripe border border-token-border-technical shadow-sm transition-all duration-150 hover:border-token-accent-brand/40 hover:bg-token-surface-active active:scale-[0.98]";

  const iconBoxClass =
    "w-8 h-8 rounded-sm flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 border border-token-border-technical/50";

  return {
    tools,
    colorClasses,
    itemClass,
    iconBoxClass,
  };
};
