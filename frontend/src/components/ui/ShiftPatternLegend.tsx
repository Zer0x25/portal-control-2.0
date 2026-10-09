import React, { useMemo } from "react";
import { TheoreticalShiftPattern } from "../../types/index";
import Button from "./Button";

interface ShiftPatternLegendProps {
  patterns: TheoreticalShiftPattern[];
  selectedPatternId?: string | null;
  onPatternSelect?: (patternId: string | null) => void;
}

const ShiftPatternLegend: React.FC<ShiftPatternLegendProps> = ({
  patterns,
  selectedPatternId,
  onPatternSelect,
}) => {
  // Sort patterns by name for consistent display
  const sortedPatterns = useMemo(() => {
    return [...patterns].sort((a, b) => a.name.localeCompare(b.name));
  }, [patterns]);

  if (patterns.length === 0) {
    return null;
  }

  return (
    <div className="bg-token-surface-card rounded-lg shadow p-4 mb-4 border border-token-border-subtle">
      <h4 className="text-sm font-semibold text-token-text-primary mb-3">
        Leyenda de Patrones de Turno
      </h4>
      <div className="flex flex-wrap gap-2">
        {onPatternSelect && (
          <Button
            variant="none"
            onClick={() => onPatternSelect(null)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-none
                            ${
                              !selectedPatternId
                                ? "bg-sap-blue text-white"
                                : "bg-token-surface-stripe text-token-text-secondary hover:bg-token-surface-card"
                            }`}
          >
            Todos
          </Button>
        )}
        {sortedPatterns.map((pattern) => (
          <Button
            variant="none"
            key={pattern.id}
            onClick={() => onPatternSelect?.(pattern.id)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-none
                            ${
                              selectedPatternId === pattern.id
                                ? "ring-2 ring-offset-2 ring-sap-blue ring-offset-token-surface-card"
                                : "hover:opacity-80"
                            }`}
            style={{
              backgroundColor: pattern.color || "#A0AEC0",
              color: getContrastColor(pattern.color || "#A0AEC0"),
            }}
            title={`${pattern.name} - ${pattern.cycleLengthDays} día(s) de ciclo`}
          >
            <span
              className="w-3 h-3 rounded-full mr-2 border border-white/30"
              style={{ backgroundColor: pattern.color || "#A0AEC0" }}
            />
            {pattern.name}
          </Button>
        ))}
      </div>

      {/* Statistics row */}
      <div className="mt-3 pt-3 border-t border-token-border-subtle flex gap-4 text-xs text-token-text-secondary">
        <span>
          <strong>{patterns.length}</strong> patrón{patterns.length !== 1 ? "es" : ""}
        </span>
      </div>
    </div>
  );
};

// Helper function to determine text color based on background
function getContrastColor(hexcolor: string): string {
  // Remove # if present
  const hex = hexcolor.replace("#", "");

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export default ShiftPatternLegend;
