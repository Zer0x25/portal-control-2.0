import React from "react";
import AboutModal from "../ui/AboutModal";
import { InformationCircleIcon, MoonIcon, SunIcon } from "../ui/icons/index";
import type { SidebarMenuItem } from "../../hooks/layout/sidebarMenu";
import SidebarNavItem from "./SidebarNavItem";

interface SidebarViewProps {
  isOpen: boolean;
  isExpanded: boolean;
  menuItems: SidebarMenuItem[];
  effectiveTheme: "light" | "dark";
  showAboutModal: boolean;
  onToggleSidebar: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onItemClick: () => void;
  onToggleTheme: () => void;
  onOpenAbout: () => void;
  onCloseAbout: () => void;
}

const SidebarView: React.FC<SidebarViewProps> = ({
  isOpen,
  isExpanded,
  menuItems,
  effectiveTheme,
  showAboutModal,
  onToggleSidebar,
  onMouseEnter,
  onMouseLeave,
  onItemClick,
  onToggleTheme,
  onOpenAbout,
  onCloseAbout,
}) => {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-55 bg-black/50 lg:hidden transition-opacity duration-300"
          onClick={onToggleSidebar}
        />
      )}

      <aside
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] z-58 flex flex-col
          bg-(--surface-sidebar)
          border-r border-token-border-technical
          transition-all duration-200 ease-out
          overflow-hidden
          ${isOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"}
          ${isExpanded ? "lg:w-72" : "lg:w-20"}
        `}
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pt-6">
          <ul className="flex flex-col gap-1">
            {menuItems.map((item) => (
              <SidebarNavItem
                key={`${item.to}-${item.label}`}
                {...item}
                isExpanded={isExpanded}
                onClick={onItemClick}
              />
            ))}
          </ul>
        </nav>

        <div className="p-3 pb-6 space-y-2 border-t border-token-border-technical">
          <button
            onClick={onToggleTheme}
            className="group flex items-center w-full px-4 py-3 rounded-md text-[11px] font-semibold uppercase tracking-wider text-token-text-secondary hover:bg-(--sidebar-item-hover) hover:text-(--sidebar-text-active) transition-all"
          >
            <div
              className={`w-6 h-6 flex items-center justify-center ${effectiveTheme === "dark" ? "text-(--status-warning)" : "text-(--sidebar-text-active)"}`}
            >
              {effectiveTheme === "dark" ? (
                <SunIcon className="w-5 h-5" />
              ) : (
                <MoonIcon className="w-5 h-5" />
              )}
            </div>
            <span
              className={`ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"}`}
            >
              {effectiveTheme === "dark" ? "Modo Luz" : "Modo Noche"}
            </span>
          </button>

          <button
            onClick={onOpenAbout}
            className="group flex items-center w-full px-4 py-3 rounded-md text-[11px] font-semibold uppercase tracking-wider text-token-text-tertiary hover:bg-(--sidebar-item-hover) hover:text-(--sidebar-text-active) transition-all"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <InformationCircleIcon className="w-5 h-5" />
            </div>
            <span
              className={`ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"}`}
            >
              Acerca de
            </span>
          </button>
        </div>
      </aside>

      <AboutModal isOpen={showAboutModal} onClose={onCloseAbout} />
    </>
  );
};

export default React.memo(SidebarView);
