import React, { useRef } from "react";
import Button from "./Button";

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  /** Icono opcional (se atenua cuando la pestana no esta activa). */
  icon?: React.ReactNode;
  /** Test id especifico de la pestana. */
  testId?: string;
}

interface TabNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  variant?: "default" | "minimal" | "underline";
  /** Nombre accesible del grupo de pestanas. */
  ariaLabel?: string;
  /** Test id del contenedor (tablist). */
  testId?: string;
  /** Prefijo para los test ids por pestana (`<prefijo>-<id>`). */
  tabTestIdPrefix?: string;
  orientation?: "horizontal" | "vertical";
}

/**
 * Tab Navigation (CSS-first, estandarizado con el resto del shell:
 * `animate-in fade-in` como el dropdown del header y CinematicModal).
 * Sin pill deslizante JS: el estado activo es una pill estatica.
 *
 * Semantica APG (spec 031 T12 / AC7): `role="tablist"`, `role="tab"`,
 * `aria-selected`, roving tabindex y navegacion con flechas, Home y End
 * (activacion automatica). Es el unico sistema de tabs del design system.
 */
const TabNav: React.FC<TabNavProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = "",
  variant = "default",
  ariaLabel = "Pestañas",
  testId,
  tabTestIdPrefix,
  orientation = "horizontal",
}) => {
  const isMinimal = variant === "minimal";
  const isUnderline = variant === "underline";
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (id: string) => {
    tabRefs.current[id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === activeTab);
    if (index === -1) return;

    const isVertical = orientation === "vertical";
    const previousKey = isVertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = isVertical ? "ArrowDown" : "ArrowRight";

    let nextIndex: number;
    if (event.key === previousKey) {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === nextKey) {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onTabChange(nextTab.id);
    // El foco sigue a la pestana activada (activacion automatica APG).
    window.requestAnimationFrame(() => focusTab(nextTab.id));
  };

  const containerClasses = isUnderline
    ? "flex border-b border-token-border-technical gap-8 overflow-x-auto no-scrollbar"
    : "p-1.5 rounded-sm border border-token-border-subtle overflow-x-auto scrollbar-hide";

  const surfaceClasses = isUnderline
    ? ""
    : !isMinimal
      ? "bg-token-surface-card shadow-sm mx-1"
      : "bg-token-surface-stripe shadow-none";

  return (
    <div
      className={`${!isMinimal && !isUnderline ? "sticky top-0 z-30 pt-1 -mx-2" : ""} ${className} w-full`}
    >
      <div className={`${containerClasses} ${surfaceClasses}`}>
        <div
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation={orientation}
          data-testid={testId}
          data-active-tab={activeTab}
          onKeyDown={handleKeyDown}
          // El foco vive en las pestanas (roving tabindex); el tablist queda
          // programaticamente enfocable segun el patron APG.
          tabIndex={-1}
          className={
            isUnderline ? "flex min-w-max gap-8" : "flex space-x-1 min-w-max scroll-smooth"
          }
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Button
                variant="none"
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                ref={(element: HTMLButtonElement | null) => {
                  tabRefs.current[tab.id] = element;
                }}
                data-testid={
                  tab.testId ?? (tabTestIdPrefix ? `${tabTestIdPrefix}-${tab.id}` : undefined)
                }
                onClick={() => onTabChange(tab.id)}
                className={
                  isUnderline
                    ? `pb-4 px-1 flex items-center gap-2.5 transition-colors relative whitespace-nowrap shrink-0 ${
                        isActive
                          ? "text-(--sidebar-text-active)"
                          : "text-token-text-tertiary hover:text-token-text-primary"
                      }`
                    : `relative whitespace-nowrap shrink-0 min-h-11 px-5 py-2 typo-ui-tab transition-colors duration-150 rounded-md flex items-center justify-center gap-2 shadow-none ${
                        isActive
                          ? "text-token-text-primary"
                          : "text-token-text-secondary hover:text-token-text-primary"
                      }`
                }
              >
                {isUnderline && tab.icon && (
                  <span className={isActive ? "opacity-100" : "opacity-60"}>{tab.icon}</span>
                )}
                {isUnderline && isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--sidebar-text-active) shadow-[0_-2px_8px_rgba(var(--sidebar-text-active-rgb),0.3)] animate-in fade-in" />
                )}
                {!isUnderline && isActive && (
                  <div
                    key={tab.id}
                    className="absolute inset-0 bg-token-surface-stripe border border-token-border-subtle shadow-sm rounded-md -z-10 animate-in fade-in"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`
                                        px-1.5 py-0.5 rounded-full text-xxs font-black transition-colors relative z-10
                                        ${isActive ? "bg-token-accent-brand text-token-text-onAccent" : "bg-token-surface-technical text-token-text-secondary"}
                                    `}
                  >
                    {tab.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabNav;
