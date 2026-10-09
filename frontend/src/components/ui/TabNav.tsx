import React from "react";
import { motion } from "framer-motion";
import Button from "./Button";

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

interface TabNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  variant?: "default" | "minimal";
}

/**
 * Cinematic Tab Navigation
 * Features a glassmorphic background and a motion pill for the active state.
 * Adheres to the "Industrial Sobriety" aesthetic with high-impact animations.
 */
const TabNav: React.FC<TabNavProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = "",
  variant = "default",
}) => {
  const isMinimal = variant === "minimal";

  return (
    <div className={`${!isMinimal ? "sticky top-0 z-30 pt-1 -mx-2" : ""} ${className} w-full`}>
      <div
        className={`p-1.5 rounded-sm border border-token-border-subtle overflow-x-auto scrollbar-hide ${
          !isMinimal
            ? "bg-token-surface-card shadow-sm mx-1"
            : "bg-token-surface-stripe shadow-none"
        }`}
      >
        <nav className="flex space-x-1 min-w-max scroll-smooth" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Button
                variant="none"
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                                    relative whitespace-nowrap shrink-0 min-h-11 px-5 py-2 typo-ui-tab transition-colors duration-150 rounded-md flex items-center justify-center gap-2 shadow-none
                                    ${
                                      isActive
                                        ? "text-token-text-primary"
                                        : "text-token-text-secondary hover:text-token-text-primary"
                                    }
                                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-token-surface-stripe border border-token-border-subtle shadow-sm rounded-md -z-10"
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`
                                        px-1.5 py-0.5 rounded-full text-[9px] font-black transition-colors relative z-10
                                        ${isActive ? "bg-indigo-600 text-white" : "bg-token-surface-technical text-token-text-secondary"}
                                    `}
                  >
                    {tab.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default TabNav;
