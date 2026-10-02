import React, { useMemo } from "react";
import { motion } from "framer-motion";
import IconBox from "../../../../components/ui/IconBox";
import { StatusInfo } from "../../types";
import { BookOpenIcon } from "../../../../components/ui/icons/index";

interface StatusCardProps {
  status: StatusInfo;
  timeText?: string;
  className?: string;
  showAnimation?: boolean;
}

/**
 * Componente reutilizable para mostrar estados en el dashboard
 * Usado para estado del usuario, turnos activos, etc.
 * Optimizado con React.memo para prevenir re-renders innecesarios
 */
export const StatusCard: React.FC<StatusCardProps> = React.memo(
  ({ status, timeText, className = "", showAnimation = true }) => {
    // Memoizar clases CSS para evitar recálculos
    const cardClasses = useMemo(
      () => `
    flex items-center justify-start gap-3.5 p-3.5 rounded-md border
    ${status.borderColor} bg-token-surface-stripe shadow-none transition-all
    ${className}
  `,
      [status.borderColor, className],
    );

    const cardContent = useMemo(
      () => (
        <div className={cardClasses}>
          <IconBox icon={status.icon} variant={status.variant} size="md" className="rounded-sm" />
          <div className="flex-1 min-w-0">
            <p className={`text-lg font-bold ${status.textColor} leading-tight`}>{status.text}</p>
            {timeText && (
              <p className="text-[9px] font-bold uppercase tracking-wider text-token-text-tertiary mt-1">
                {timeText}
              </p>
            )}
          </div>
        </div>
      ),
      [cardClasses, status.icon, status.variant, status.textColor, status.text, timeText],
    );

    if (!showAnimation) {
      return cardContent;
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {cardContent}
      </motion.div>
    );
  },
);

StatusCard.displayName = "StatusCard";

interface ShiftStatusCardProps {
  responsibleName: string;
  className?: string;
  showAnimation?: boolean;
}

/**
 * Componente específico para mostrar información de turno activo
 */
export const ShiftStatusCard: React.FC<ShiftStatusCardProps> = ({
  responsibleName,
  className = "",
  showAnimation = true,
}) => {
  const shiftContent = (
    <div
      className={`
      flex items-center justify-start gap-3.5 p-3.5 rounded-md border
      border-token-border-subtle bg-token-surface-card
      ${className}
    `}
    >
      <IconBox icon={<BookOpenIcon />} variant="primary" size="sm" className="rounded-sm" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest leading-none mb-1.5">
          Turno en curso
        </p>
        <p className="text-sm font-bold text-sap-blue truncate">{responsibleName}</p>
      </div>
    </div>
  );

  if (!showAnimation) {
    return shiftContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {shiftContent}
    </motion.div>
  );
};
