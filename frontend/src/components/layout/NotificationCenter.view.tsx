import React from "react";
import {
  BellIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "../ui/icons/index";
import { NotificationItem } from "../../types";

interface NotificationCenterViewProps {
  isOpen: boolean;
  unreadCount: number;
  notifications: NotificationItem[];
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onNotificationClick: (
    id: string,
    link: string,
    type: "request" | "communication" | "alert",
  ) => void;
}

const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  isOpen,
  unreadCount,
  notifications,
  dropdownRef,
  onToggleOpen,
  onNotificationClick,
}) => {
  const getIconForType = (type: "request" | "communication" | "alert") => {
    switch (type) {
      case "alert":
        return (
          <ExclamationTriangleIcon className="w-5 h-5 text-token-status-error animate-pulse" />
        );
      case "request":
        return <CheckCircleIcon className="w-5 h-5 text-token-status-warning" />;
      case "communication":
        return <InformationCircleIcon className="w-5 h-5 text-token-accent-brand" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef} data-testid="notification-center">
      <button
        data-testid="notification-bell-button"
        onClick={onToggleOpen}
        className={`
          group relative p-2.5 rounded-md transition-all active:scale-95 border
          ${
            isOpen
              ? "bg-token-surface-active border-token-border-technical shadow-inner"
              : "bg-transparent border-transparent hover:bg-token-surface-active"
          }
        `}
        title="Notificaciones"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <BellIcon
          className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
            isOpen
              ? "text-token-accent-brand"
              : "text-token-text-tertiary group-hover:text-token-accent-brand"
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-token-status-error opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-token-status-error text-token-text-onAccent text-[9px] font-black border border-token-surface-header">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-md bg-token-surface-card border border-token-border-technical shadow-2xl z-70 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-6 py-4 border-b border-token-border-subtle bg-token-surface-stripe">
            <h3 className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.2em] leading-none">
              Notificaciones del Sistema
            </h3>
          </div>
          <div className="py-2 max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onNotificationClick(n.id, n.link, n.type)}
                  className="px-6 py-4 flex items-start gap-4 hover:bg-token-surface-active cursor-pointer transition-colors group border-b border-token-border-subtle/30 last:border-b-0"
                >
                  <div className="shrink-0 mt-0.5">{getIconForType(n.type)}</div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-token-text-primary leading-tight mb-1 uppercase tracking-tight">
                      {n.title}
                    </p>
                    <p className="text-[10px] font-bold text-token-text-tertiary leading-normal group-hover:text-token-text-secondary transition-colors">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center opacity-40">
                <InformationCircleIcon className="w-8 h-8 mx-auto text-token-border-technical mb-3" />
                <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest">
                  Sin notificaciones
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenterView;
