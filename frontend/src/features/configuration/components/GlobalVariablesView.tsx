import React from "react";
import { GlobalVariablesManager } from "./GlobalVariablesManager";
import { ShieldIcon } from "../../../components/ui/icons/index";

const GlobalVariablesView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-[11px] font-bold text-token-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <ShieldIcon className="w-4 h-4 text-[var(--sidebar-text-active)]" />
          Variables Globales de Negocio
        </h3>
      </div>
      <GlobalVariablesManager />
    </div>
  );
};

export default GlobalVariablesView;
