import React from "react";
import { NavLink } from "react-router";
import type { SidebarMenuItem } from "../../hooks/layout/sidebarMenu";

interface SidebarNavItemProps extends SidebarMenuItem {
  isExpanded: boolean;
  onClick: () => void;
}

const SidebarNavItem = React.memo(
  ({ to, icon: Icon, label, end = false, isExpanded, onClick }: SidebarNavItemProps) => {
    const itemSlug = to.replace(/^\//, "").replace(/\//g, "-") || "home";

    return (
      <li>
        <NavLink
          to={to}
          end={end}
          onClick={onClick}
          data-testid={`nav-item-${itemSlug}`}
          data-nav-to={to}
          data-nav-label={label}
          className={({ isActive }) => `
          group flex items-center px-4 py-2.5 mb-1 mx-2 rounded-md transition-all duration-150
          ${
            isActive
              ? "bg-token-sidebar-text-active text-white shadow-sm"
              : "text-token-text-secondary hover:bg-token-sidebar-item-hover hover:text-token-sidebar-text-active"
          }
      `}
        >
          {({ isActive }) => (
            <>
              <div
                className="shrink-0 flex items-center justify-center w-6 h-6"
                data-nav-active={isActive ? "true" : "false"}
              >
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? "text-white" : ""}`} />
              </div>
              <span
                className={`
                ml-4 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-200 ease-out
                ${isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"}
              `}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      </li>
    );
  },
);

SidebarNavItem.displayName = "SidebarNavItem";

export default SidebarNavItem;
