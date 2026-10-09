import React from "react";
import { useServerTime } from "../../hooks/useServerTime";

interface ServerClockProps {
  showDate?: boolean;
  dateClassName?: string;
  timeClassName?: string;
  containerClassName?: string;
}

/**
 * A small, isolated component that renders the synchronized server time.
 * Using this prevents larger parent components from re-rendering every time
 * the time ticks or the server offset is synchronized.
 */
const ServerClock: React.FC<ServerClockProps> = ({
  showDate = true,
  dateClassName = "font-black text-xs text-token-text-secondary",
  timeClassName = "text-5xl md:text-7xl text-sap-blue dark:text-sap-light-blue",
  containerClassName = "flex flex-col items-center justify-center p-6 bg-token-surface-card md:bg-white/5 md:backdrop-blur-xl rounded-[2.5rem] border border-token-border-subtle md:border-white/10",
}) => {
  const currentDateTime = useServerTime();

  return (
    <div className={containerClassName}>
      {showDate && (
        <div className={dateClassName}>
          {currentDateTime.toLocaleDateString("es-CL", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      )}
      <div className={timeClassName}>
        {currentDateTime.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })}
      </div>
    </div>
  );
};

export default React.memo(ServerClock);
