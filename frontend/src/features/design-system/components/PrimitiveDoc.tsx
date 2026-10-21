import React from "react";

interface PrimitiveDocProps {
  /** Nombre de la primitiva. */
  name: string;
  /** Ruta del componente en el repositorio. */
  path: string;
  /** Cuando usarla. */
  usage: string;
  /** Variantes soportadas. */
  variants?: string[];
  /** Estados relevantes. */
  states?: string[];
  /** Nota de accesibilidad. */
  a11y?: string;
}

/**
 * Cabecera de documentacion de una primitiva del design system
 * (spec 031 T18 / AC12). Acompana a cada ejemplo del catalogo.
 */
const PrimitiveDoc: React.FC<PrimitiveDocProps> = ({
  name,
  path,
  usage,
  variants,
  states,
  a11y,
}) => {
  return (
    <div className="rounded-md border border-token-border-subtle bg-token-surface-stripe p-4 space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="typo-ui-title text-token-text-primary">{name}</span>
        <code className="text-xxs font-mono text-token-text-tertiary">{path}</code>
      </div>

      <p className="text-xs text-token-text-secondary leading-relaxed">{usage}</p>

      <div className="flex flex-wrap gap-2">
        {variants?.map((variant) => (
          <span
            key={variant}
            className="px-2 py-0.5 rounded-sm bg-token-surface-technical text-xxs font-mono text-token-text-secondary"
          >
            {variant}
          </span>
        ))}
        {states?.map((state) => (
          <span
            key={state}
            className="px-2 py-0.5 rounded-sm bg-token-accent-brand/10 text-xxs font-mono text-token-accent-brand"
          >
            {state}
          </span>
        ))}
      </div>

      {a11y && (
        <p className="text-xxs text-token-text-tertiary border-l-2 border-token-accent-brand/40 pl-2">
          {a11y}
        </p>
      )}
    </div>
  );
};

export default PrimitiveDoc;
