import React from "react";
import { WidgetContainer } from "./ui/WidgetContainer";
import { ActionButton } from "./ui/ActionButton";
import { useQuickActionsLogic } from "../hooks/useQuickActionsLogic";

const QuickActionsPanel: React.FC = () => {
  const { actions, handleNavigate } = useQuickActionsLogic();

  return (
    <WidgetContainer title="Accesos Rápidos">
      <div className="grid grid-cols-2 gap-3 py-1">
        {actions.map((action) => (
          <ActionButton
            key={action.id}
            color={action.color}
            icon={action.icon}
            label={action.label}
            onClick={() => handleNavigate(action.route)}
          />
        ))}
      </div>
    </WidgetContainer>
  );
};

export default QuickActionsPanel;
