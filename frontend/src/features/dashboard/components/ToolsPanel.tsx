import React from "react";
import { WidgetContainer } from "./ui/WidgetContainer";
import { ActionButton } from "./ui/ActionButton";
import { useToolsLogic } from "../hooks/useToolsLogic";

const ToolsPanel: React.FC = () => {
  const { tools } = useToolsLogic();

  return (
    <WidgetContainer title="Recursos del Sistema">
      <div className="grid grid-cols-2 gap-3 py-1">
        {tools.map((tool) => (
          <ActionButton
            key={tool.id}
            color={tool.color}
            icon={tool.icon}
            label={tool.label}
            hasNotification={tool.hasNotification}
            {...(tool.type === "link"
              ? { href: tool.action as string }
              : { onClick: tool.action as () => void })}
          />
        ))}
      </div>
    </WidgetContainer>
  );
};

export default ToolsPanel;
