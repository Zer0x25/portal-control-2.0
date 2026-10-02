import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import Card from "../../../../components/ui/Card";
import { WidgetContainerProps } from "../../types";

/**
 * Contenedor genérico para widgets del dashboard
 * Proporciona animaciones, loading states y estructura consistente
 */
export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  title,
  children,
  className = "",
  isLoading = false,
  error = null,
}) => {
  if (error) {
    return (
      <Card title={title} className={className}>
        <div className="flex items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <div className="text-red-500 text-sm font-medium">Error al cargar</div>
            <div className="text-token-text-tertiary text-xs">{error}</div>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card title={title} className={className}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sap-blue"></div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card title={title}>{children}</Card>
    </motion.div>
  );
};

/**
 * Variante especial para el panel de bienvenida con animación diferente
 */
export const WelcomeWidgetContainer: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`col-span-1 md:col-span-2 lg:col-span-3 mb-4 ${className}`}
    >
      {children}
    </motion.div>
  );
};
