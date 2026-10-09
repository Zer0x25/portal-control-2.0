import React from "react";
import EmptyState from "../../../components/ui/EmptyState";

const WizardContainer: React.FC = () => {
  return (
    <div className="h-full p-6">
      <EmptyState
        icon={<span className="text-3xl">🚧</span>}
        title="Módulo en Construcción"
        description="El asistente de planificación mensual aún no está disponible. Por favor, utilice la gestión individual o contacte al administrador."
        className="h-full"
      />
    </div>
  );
};

export default WizardContainer;
