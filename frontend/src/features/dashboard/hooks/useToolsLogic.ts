import { useNavigate } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../../store/useStore";
import { ROUTES } from "../../../constants";
import {
  ClipboardIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CalculatorIcon,
} from "../../../components/ui/icons/index";
import { ToolConfig, ColorTheme } from "../types";
import { configService } from "../../../services/configService";

export const useToolsLogic = () => {
  const navigate = useNavigate();
  const handleOpenQuickNotes = useStore((state) => state.handleOpenQuickNotes);
  const hasUnreadNotes = useStore((state) => state.hasUnreadNotes);
  const [policyUrl, setPolicyUrl] = useState(
    import.meta.env.VITE_COMPANY_POLICY_URL || "/api/configs/public/company-policy/file",
  );

  useEffect(() => {
    let mounted = true;
    configService
      .getPublicCompanyPolicy()
      .then((policy) => {
        if (!mounted || !policy?.url) return;
        setPolicyUrl(policy.url);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const tools: ToolConfig[] = useMemo(
    () => [
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
        action: handleOpenQuickNotes,
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
    ],
    [hasUnreadNotes, handleOpenQuickNotes, navigate, policyUrl],
  );

  const colorClasses: Record<string, string> = {
    orange: "bg-orange-600/10 text-orange-600",
    emerald: "bg-emerald-600/10 text-emerald-600",
    indigo: "bg-indigo-600/10 text-indigo-600",
    violet: "bg-violet-600/10 text-violet-600",
  };

  const itemClass =
    "group relative p-3.5 h-[90px] rounded-sm flex flex-col items-center justify-center text-center bg-token-surface-stripe border border-token-border-technical shadow-sm transition-all duration-150 hover:border-sap-blue/40 hover:bg-token-surface-active active:scale-[0.98]";

  const iconBoxClass =
    "w-8 h-8 rounded-sm flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 border border-token-border-technical/50";

  return {
    tools,
    colorClasses,
    itemClass,
    iconBoxClass,
  };
};
