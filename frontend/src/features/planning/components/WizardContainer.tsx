import React from "react";

const WizardContainer: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <div className="text-4xl mb-4">🚧</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
        Módulo en Construcción
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md">
        El asistente de planificación mensual aún no está disponible. Por favor, utilice la gestión
        individual o contacte al administrador.
      </p>
    </div>
  );
};

export default WizardContainer;
